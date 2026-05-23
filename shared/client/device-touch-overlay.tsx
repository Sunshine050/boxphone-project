"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  mapClientToDevice,
  mapClientToVideo,
  type Size2D,
} from "./map-pointer-to-device";
import {
  sendDeviceInputFast,
  type DeviceInputTarget,
} from "./device-input-transport";

export type DeviceTouchOverlayProps = {
  deviceId: string;
  deviceSerial?: string;
  apiBaseUrl: string;
  getNaturalSize: () => Size2D;
  getVideoElement: () => HTMLElement | null;
  getVideoSize?: () => Size2D;
  onAction?: () => void;
};

/** Max finger movement still counted as a tap (small buttons). */
const TAP_MOVE_PX = 8;
const TAP_MS = 450;
const LONG_PRESS_MS = 550;
const MOVE_INTERVAL_MS = 36;
const MOVE_MIN_PX = 2;
const SWIPE_START_PX = 10;
const MAX_POINTERS = 2;

type ActivePointer = {
  id: number;
  pointerIndex: number;
  isPrimary: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  t: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  longPressFired: boolean;
  longPressHolding: boolean;
  isSwiping: boolean;
  touchActive: boolean;
  lastSentX: number;
  lastSentY: number;
  lastMoveSentAt: number;
  downAck: boolean;
};

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function DeviceTouchOverlay({
  deviceId,
  deviceSerial,
  apiBaseUrl,
  getNaturalSize,
  getVideoElement,
  getVideoSize,
  onAction,
}: DeviceTouchOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, ActivePointer>>(new Map());
  const primaryPointerIdRef = useRef<number | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const pendingMovesRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(
    null,
  );
  const crosshairTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputTarget: DeviceInputTarget = { deviceId, deviceSerial };
  const swipeStartPx = isCoarsePointer() ? SWIPE_START_PX : 14;

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchstart", prevent, { passive: false });
    el.addEventListener("touchmove", prevent, { passive: false });
    el.addEventListener("touchend", prevent, { passive: false });
    return () => {
      el.removeEventListener("touchstart", prevent);
      el.removeEventListener("touchmove", prevent);
      el.removeEventListener("touchend", prevent);
    };
  }, []);

  const resolveVideoSize = useCallback((): Size2D => {
    const v = getVideoSize?.();
    if (v && v.width > 0 && v.height > 0) return v;
    const el = getVideoElement();
    if (el instanceof HTMLCanvasElement && el.width > 0 && el.height > 0) {
      return { width: el.width, height: el.height };
    }
    if (el instanceof HTMLImageElement && el.naturalWidth > 0) {
      return { width: el.naturalWidth, height: el.naturalHeight };
    }
    return getNaturalSize();
  }, [getVideoSize, getVideoElement, getNaturalSize]);

  const resolveDeviceSize = useCallback((): Size2D => {
    const natural = getNaturalSize();
    if (natural.width > 0 && natural.height > 0) return natural;
    const video = resolveVideoSize();
    if (video.width > 0 && video.height > 0) return video;
    return { width: 1080, height: 1920 };
  }, [getNaturalSize, resolveVideoSize]);

  const toDevice = useCallback(
    (clientX: number, clientY: number) => {
      const el = getVideoElement() ?? overlayRef.current;
      if (!el) return null;
      return mapClientToDevice(
        clientX,
        clientY,
        el,
        resolveVideoSize(),
        resolveDeviceSize(),
      );
    },
    [getVideoElement, resolveVideoSize, resolveDeviceSize],
  );

  const toVideo = useCallback(
    (clientX: number, clientY: number) => {
      const el = getVideoElement() ?? overlayRef.current;
      if (!el) return null;
      const video = resolveVideoSize();
      if (video.width <= 0 || video.height <= 0) return null;
      return mapClientToVideo(clientX, clientY, el, video);
    },
    [getVideoElement, resolveVideoSize],
  );

  const showCrosshair = useCallback(
    (clientX: number, clientY: number, persist = false) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCrosshair({ x: clientX - rect.left, y: clientY - rect.top });
      if (crosshairTimer.current) clearTimeout(crosshairTimer.current);
      if (!persist) {
        crosshairTimer.current = setTimeout(() => setCrosshair(null), 700);
      }
    },
    [],
  );

  const clearCrosshair = useCallback(() => {
    if (crosshairTimer.current) clearTimeout(crosshairTimer.current);
    crosshairTimer.current = setTimeout(() => setCrosshair(null), 400);
  }, []);

  const sendTouch = useCallback(
    (
      action: "down" | "up" | "move",
      x: number,
      y: number,
      pointerIndex: number,
    ) => {
      sendDeviceInputFast(apiBaseUrl, inputTarget, "touch", {
        action,
        x,
        y,
        pointerId: pointerIndex,
      });
    },
    [apiBaseUrl, inputTarget],
  );

  const flushTouchMove = useCallback(
    (pointerId: number, clientX: number, clientY: number, force = false) => {
      const p = pointersRef.current.get(pointerId);
      if (!p?.touchActive || !p.downAck) return;
      const pos = toVideo(clientX, clientY);
      if (!pos) return;
      const now = performance.now();
      if (
        !force &&
        now - p.lastMoveSentAt < MOVE_INTERVAL_MS &&
        Math.hypot(pos.x - p.lastSentX, pos.y - p.lastSentY) < MOVE_MIN_PX
      ) {
        return;
      }
      p.lastMoveSentAt = now;
      p.lastSentX = pos.x;
      p.lastSentY = pos.y;
      sendTouch("move", pos.x, pos.y, p.pointerIndex);
    },
    [sendTouch, toVideo],
  );

  const runMoveRaf = useCallback(() => {
    moveRafRef.current = null;
    const pending = pendingMovesRef.current;
    if (pending.size === 0) return;
    for (const [pointerId, pos] of pending) {
      flushTouchMove(pointerId, pos.x, pos.y);
    }
    pending.clear();
  }, [flushTouchMove]);

  const scheduleTouchMove = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      pendingMovesRef.current.set(pointerId, { x: clientX, y: clientY });
      if (moveRafRef.current == null) {
        moveRafRef.current = requestAnimationFrame(runMoveRaf);
      }
    },
    [runMoveRaf],
  );

  const beginTouchDrag = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const p = pointersRef.current.get(pointerId);
      if (!p || p.touchActive || p.longPressHolding) return;
      const start = toVideo(p.startX, p.startY);
      if (!start) return;

      p.touchActive = true;
      p.isSwiping = true;
      p.lastSentX = start.x;
      p.lastSentY = start.y;
      p.lastMoveSentAt = 0;
      p.downAck = true;

      sendTouch("down", start.x, start.y, p.pointerIndex);

      const current = toVideo(clientX, clientY);
      if (current && (current.x !== start.x || current.y !== start.y)) {
        flushTouchMove(pointerId, clientX, clientY, true);
      }
    },
    [toVideo, sendTouch, flushTouchMove],
  );

  const beginLongPressHold = useCallback(
    (pointerId: number) => {
      const p = pointersRef.current.get(pointerId);
      if (!p || p.touchActive || p.longPressHolding) return;
      const pos = toVideo(p.startX, p.startY);
      if (!pos) return;

      p.longPressFired = true;
      p.longPressHolding = true;
      p.touchActive = true;
      p.downAck = true;
      p.lastSentX = pos.x;
      p.lastSentY = pos.y;

      try {
        navigator.vibrate?.(25);
      } catch {
        /* ignore */
      }

      sendTouch("down", pos.x, pos.y, p.pointerIndex);
      showCrosshair(p.startX, p.startY, true);
    },
    [toVideo, sendTouch, showCrosshair],
  );

  const endTouch = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const p = pointersRef.current.get(pointerId);
      if (!p?.touchActive) return;
      flushTouchMove(pointerId, clientX, clientY, true);
      const end = toVideo(clientX, clientY);
      if (end && p.downAck) {
        sendTouch("up", end.x, end.y, p.pointerIndex);
      }
      p.touchActive = false;
      p.downAck = false;
      p.longPressHolding = false;
    },
    [flushTouchMove, toVideo, sendTouch],
  );

  const allocPointerIndex = (): number => {
    const used = new Set<number>();
    for (const p of pointersRef.current.values()) used.add(p.pointerIndex);
    for (let i = 0; i < MAX_POINTERS; i++) {
      if (!used.has(i)) return i;
    }
    return 0;
  };

  const processPointerMove = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const p = pointersRef.current.get(pointerId);
      if (!p) return;
      p.lastX = clientX;
      p.lastY = clientY;

      if (p.longPressHolding) {
        showCrosshair(clientX, clientY, true);
        if (p.touchActive && p.downAck) {
          scheduleTouchMove(pointerId, clientX, clientY);
        }
        return;
      }

      if (!p.isPrimary) {
        const pos = toVideo(clientX, clientY);
        if (pos && p.touchActive && p.downAck) {
          sendTouch("move", pos.x, pos.y, p.pointerIndex);
        }
        showCrosshair(clientX, clientY);
        return;
      }

      const dist = Math.hypot(clientX - p.startX, clientY - p.startY);
      if (!p.isSwiping && !p.longPressFired && dist >= swipeStartPx) {
        if (p.longPressTimer) {
          clearTimeout(p.longPressTimer);
          p.longPressTimer = null;
        }
        beginTouchDrag(pointerId, clientX, clientY);
      }
      if (p.touchActive && p.downAck) {
        scheduleTouchMove(pointerId, clientX, clientY);
      }
      showCrosshair(clientX, clientY);
    },
    [
      beginTouchDrag,
      scheduleTouchMove,
      showCrosshair,
      swipeStartPx,
      sendTouch,
      toVideo,
    ],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (pointersRef.current.has(e.pointerId)) return;
    if (pointersRef.current.size >= MAX_POINTERS) return;

    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const isPrimary = primaryPointerIdRef.current == null;
    if (isPrimary) primaryPointerIdRef.current = e.pointerId;

    const pointerIndex = allocPointerIndex();
    showCrosshair(e.clientX, e.clientY, true);

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    if (isPrimary) {
      longPressTimer = setTimeout(() => {
        const p = pointersRef.current.get(e.pointerId);
        if (!p || p.isSwiping || p.touchActive || p.longPressFired) return;
        const dist = Math.hypot(p.lastX - p.startX, p.lastY - p.startY);
        if (dist >= TAP_MOVE_PX) return;
        beginLongPressHold(e.pointerId);
        onAction?.();
      }, LONG_PRESS_MS);
    }

    const entry: ActivePointer = {
      id: e.pointerId,
      pointerIndex,
      isPrimary,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      t: performance.now(),
      longPressTimer,
      longPressFired: false,
      longPressHolding: false,
      isSwiping: false,
      touchActive: false,
      lastSentX: 0,
      lastSentY: 0,
      lastMoveSentAt: 0,
      downAck: false,
    };
    pointersRef.current.set(e.pointerId, entry);

    if (!isPrimary) {
      const pos = toVideo(e.clientX, e.clientY);
      if (pos) {
        entry.touchActive = true;
        entry.downAck = true;
        sendTouch("down", pos.x, pos.y, pointerIndex);
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointersRef.current.get(e.pointerId);
    if (!p) return;
    e.preventDefault();

    const native = e.nativeEvent as PointerEvent;
    const coalesced =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];
    for (const ev of coalesced) {
      processPointerMove(e.pointerId, ev.clientX, ev.clientY);
    }
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    const p = pointersRef.current.get(e.pointerId);
    if (!p) return;
    e.preventDefault();

    if (p.longPressTimer) {
      clearTimeout(p.longPressTimer);
      p.longPressTimer = null;
    }

    const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
    const dt = performance.now() - p.t;

    if (p.isPrimary) {
      if (p.touchActive || p.longPressHolding) {
        endTouch(e.pointerId, e.clientX, e.clientY);
        clearCrosshair();
      } else if (
        !p.isSwiping &&
        !p.longPressFired &&
        dist < TAP_MOVE_PX &&
        dt < TAP_MS
      ) {
        const pos = toDevice(p.startX, p.startY);
        if (pos) {
          showCrosshair(p.startX, p.startY);
          try {
            navigator.vibrate?.(6);
          } catch {
            /* ignore */
          }
          try {
            await sendDeviceInputFast(
              apiBaseUrl,
              inputTarget,
              "tap",
              { x: pos.x, y: pos.y },
              { awaitResponse: true },
            );
            onAction?.();
          } catch (err) {
            console.warn("[touch] tap failed", err);
          }
        }
        clearCrosshair();
      } else if (p.isSwiping && !p.touchActive) {
        const from = toDevice(p.startX, p.startY);
        const to = toDevice(e.clientX, e.clientY);
        if (from && to) {
          void sendDeviceInputFast(
            apiBaseUrl,
            inputTarget,
            "swipe",
            {
              x1: from.x,
              y1: from.y,
              x2: to.x,
              y2: to.y,
              duration: Math.max(220, Math.min(Math.round(dt * 1.2), 600)),
            },
            { awaitResponse: true },
          )?.catch(() => {});
          onAction?.();
        }
        clearCrosshair();
      }
    } else if (p.touchActive && p.downAck) {
      const pos = toVideo(e.clientX, e.clientY);
      if (pos) {
        sendTouch("up", pos.x, pos.y, p.pointerIndex);
      }
      p.touchActive = false;
      p.downAck = false;
    }

    pointersRef.current.delete(e.pointerId);
    pendingMovesRef.current.delete(e.pointerId);
    if (primaryPointerIdRef.current === e.pointerId) {
      primaryPointerIdRef.current = null;
    }
    if (pointersRef.current.size === 0 && moveRafRef.current != null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
  };

  const onPointerCancel = async (e: React.PointerEvent) => {
    const p = pointersRef.current.get(e.pointerId);
    if (!p) return;
    if (p.longPressTimer) clearTimeout(p.longPressTimer);
    if (p.touchActive && p.downAck) {
      const pos = toVideo(p.lastX, p.lastY);
      if (pos) {
        sendTouch("up", pos.x, pos.y, p.pointerIndex);
      }
    }
    pointersRef.current.delete(e.pointerId);
    pendingMovesRef.current.delete(e.pointerId);
    if (primaryPointerIdRef.current === e.pointerId) {
      primaryPointerIdRef.current = null;
    }
    if (pointersRef.current.size === 0 && moveRafRef.current != null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
    clearCrosshair();
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10 cursor-crosshair touch-none select-none"
      style={
        {
          touchAction: "none",
          WebkitTouchCallout: "none",
          WebkitTapHighlightColor: "transparent",
        } as React.CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {crosshair && (
        <span
          className="pointer-events-none absolute z-20"
          style={{ left: crosshair.x, top: crosshair.y }}
          aria-hidden
        >
          <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full border border-cyan-400/90 bg-cyan-500/15 shadow-[0_0_8px_rgba(34,211,238,0.45)]" />
          <span className="absolute -left-0.5 -top-0.5 h-1 w-1 rounded-full bg-cyan-300" />
        </span>
      )}
    </div>
  );
}
