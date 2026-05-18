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

const TAP_MOVE_PX = 12;
const TAP_MS = 420;
const LONG_PRESS_MS = 500;
const MOVE_INTERVAL_MS = 32;
const MOVE_MIN_PX = 2;
const SWIPE_START_PX = 5;
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
  const swipeStartPx = isCoarsePointer() ? SWIPE_START_PX : 7;

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

  /** scrcpy control channel — same letterbox math, video frame coordinates */
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

  const showCrosshair = useCallback((clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCrosshair({ x: clientX - rect.left, y: clientY - rect.top });
    if (crosshairTimer.current) clearTimeout(crosshairTimer.current);
    crosshairTimer.current = setTimeout(() => setCrosshair(null), 900);
  }, []);

  const sendTouch = useCallback(
    (
      action: "down" | "up" | "move",
      x: number,
      y: number,
      pointerIndex: number,
      opts?: { awaitResponse?: boolean },
    ) => {
      sendDeviceInputFast(
        apiBaseUrl,
        inputTarget,
        "touch",
        { action, x, y, pointerId: pointerIndex },
        opts,
      );
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
    async (pointerId: number, clientX: number, clientY: number) => {
      const p = pointersRef.current.get(pointerId);
      if (!p || p.touchActive) return;
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

  const endTouch = useCallback(
    async (pointerId: number, clientX: number, clientY: number) => {
      const p = pointersRef.current.get(pointerId);
      if (!p?.touchActive) return;
      flushTouchMove(pointerId, clientX, clientY, true);
      const end = toVideo(clientX, clientY);
      if (end && p.downAck) {
        sendTouch("up", end.x, end.y, p.pointerIndex);
      }
      p.touchActive = false;
      p.downAck = false;
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

      if (!p.isPrimary) {
        const pos = toVideo(clientX, clientY);
        if (pos && p.touchActive && p.downAck) {
          sendTouch("move", pos.x, pos.y, p.pointerIndex);
        }
        showCrosshair(clientX, clientY);
        return;
      }

      const dist = Math.hypot(clientX - p.startX, clientY - p.startY);
      if (!p.isSwiping && dist >= swipeStartPx) {
        if (p.longPressTimer) {
          clearTimeout(p.longPressTimer);
          p.longPressTimer = null;
        }
        void beginTouchDrag(pointerId, clientX, clientY);
      }
      if (p.touchActive && p.downAck) {
        scheduleTouchMove(pointerId, clientX, clientY);
      }
      showCrosshair(clientX, clientY);
    },
    [beginTouchDrag, scheduleTouchMove, showCrosshair, swipeStartPx, sendTouch, toVideo],
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
    showCrosshair(e.clientX, e.clientY);

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    if (isPrimary) {
      longPressTimer = setTimeout(() => {
        const p = pointersRef.current.get(e.pointerId);
        if (!p || p.isSwiping || p.touchActive || p.longPressFired) return;
        const dist = Math.hypot(p.lastX - p.startX, p.lastY - p.startY);
        if (dist >= TAP_MOVE_PX) return;
        const pos = toDevice(p.startX, p.startY);
        if (!pos) return;
        p.longPressFired = true;
        try {
          navigator.vibrate?.(30);
        } catch {
          /* ignore */
        }
        void sendDeviceInputFast(
          apiBaseUrl,
          inputTarget,
          "swipe",
          {
            x1: pos.x,
            y1: pos.y,
            x2: pos.x,
            y2: pos.y,
            duration: 600,
          },
          { awaitResponse: true },
        )?.catch(() => {});
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
      if (p.touchActive) {
        await endTouch(e.pointerId, e.clientX, e.clientY);
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
            navigator.vibrate?.(8);
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
              duration: Math.max(200, Math.min(Math.round(dt * 1.15), 550)),
            },
            { awaitResponse: true },
          )?.catch(() => {});
          onAction?.();
        }
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
          <span className="absolute -left-4 -top-4 h-8 w-8 rounded-full border-2 border-cyan-300/95 bg-cyan-400/20 shadow-[0_0_14px_rgba(34,211,238,0.55)]" />
          <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(103,232,249,0.9)]" />
        </span>
      )}
    </div>
  );
}
