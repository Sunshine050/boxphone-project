"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mapClientToDevice, type Size2D } from "./map-pointer-to-device";
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
  /** Encoded frame size (canvas / image). Falls back to natural size. */
  getVideoSize?: () => Size2D;
  onAction?: () => void;
};

const TAP_MOVE_PX = 10;
const TAP_MS = 400;
const LONG_PRESS_MS = 480;
const MOVE_INTERVAL_MS = 10;
const SWIPE_START_PX = 3;
const MAX_POINTERS = 10;

type ActivePointer = {
  id: number;
  pointerIndex: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  t: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
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
  const moveRafRef = useRef<number | null>(null);
  const pendingMovesRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const [crosshairs, setCrosshairs] = useState<
    Map<number, { x: number; y: number }>
  >(new Map());
  const crosshairTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const inputTarget: DeviceInputTarget = {
    deviceId,
    deviceSerial,
  };

  const swipeStartPx = isCoarsePointer() ? SWIPE_START_PX : 5;

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

  const toDevice = useCallback(
    (clientX: number, clientY: number) =>
      mapClientToDevice(
        clientX,
        clientY,
        getVideoElement(),
        resolveVideoSize(),
        getNaturalSize(),
      ),
    [getVideoElement, resolveVideoSize, getNaturalSize],
  );

  const showCrosshair = useCallback((pointerId: number, clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const local = { x: clientX - rect.left, y: clientY - rect.top };
    setCrosshairs((prev) => {
      const next = new Map(prev);
      next.set(pointerId, local);
      return next;
    });
    const existing = crosshairTimers.current.get(pointerId);
    if (existing) clearTimeout(existing);
    crosshairTimers.current.set(
      pointerId,
      setTimeout(() => {
        setCrosshairs((prev) => {
          const next = new Map(prev);
          next.delete(pointerId);
          return next;
        });
        crosshairTimers.current.delete(pointerId);
      }, 280),
    );
  }, []);

  const sendTouch = useCallback(
    (
      action: string,
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

      const pos = toDevice(clientX, clientY);
      if (!pos) return;

      const now = performance.now();
      if (
        !force &&
        now - p.lastMoveSentAt < MOVE_INTERVAL_MS &&
        Math.hypot(pos.x - p.lastSentX, pos.y - p.lastSentY) < 1
      ) {
        return;
      }

      p.lastMoveSentAt = now;
      p.lastSentX = pos.x;
      p.lastSentY = pos.y;
      sendTouch("move", pos.x, pos.y, p.pointerIndex);
    },
    [sendTouch, toDevice],
  );

  const runMoveRaf = useCallback(() => {
    moveRafRef.current = null;
    const pending = pendingMovesRef.current;
    if (pending.size === 0) return;
    const copy = new Map(pending);
    pendingMovesRef.current = new Map();
    for (const [pointerId, pos] of copy) {
      flushTouchMove(pointerId, pos.x, pos.y);
    }
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

      const start = toDevice(p.startX, p.startY);
      if (!start) return;

      p.touchActive = true;
      p.isSwiping = true;
      p.lastSentX = start.x;
      p.lastSentY = start.y;
      p.lastMoveSentAt = 0;
      p.downAck = false;

      try {
        await sendTouch("down", start.x, start.y, p.pointerIndex, {
          awaitResponse: true,
        });
        p.downAck = true;
      } catch {
        p.touchActive = false;
        p.isSwiping = false;
        return;
      }

      const current = toDevice(clientX, clientY);
      if (current && (current.x !== start.x || current.y !== start.y)) {
        flushTouchMove(pointerId, clientX, clientY, true);
      }
    },
    [toDevice, sendTouch, flushTouchMove],
  );

  const endTouch = useCallback(
    async (pointerId: number, clientX: number, clientY: number) => {
      const p = pointersRef.current.get(pointerId);
      if (!p?.touchActive) return;

      flushTouchMove(pointerId, clientX, clientY, true);
      const end = toDevice(clientX, clientY);
      if (end && p.downAck) {
        try {
          await sendTouch("up", end.x, end.y, p.pointerIndex, {
            awaitResponse: true,
          });
        } catch {
          /* best-effort */
        }
      }
      p.touchActive = false;
      p.downAck = false;
    },
    [flushTouchMove, toDevice, sendTouch],
  );

  const processPointerMove = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const p = pointersRef.current.get(pointerId);
      if (!p) return;

      p.lastX = clientX;
      p.lastY = clientY;

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

      showCrosshair(pointerId, clientX, clientY);
    },
    [beginTouchDrag, scheduleTouchMove, showCrosshair, swipeStartPx],
  );

  const allocPointerIndex = (): number => {
    const used = new Set(
      [...pointersRef.current.values()].map((p) => p.pointerIndex),
    );
    for (let i = 0; i < MAX_POINTERS; i++) {
      if (!used.has(i)) return i;
    }
    return 0;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (pointersRef.current.size >= MAX_POINTERS) return;
    if (pointersRef.current.has(e.pointerId)) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const pointerIndex = allocPointerIndex();
    showCrosshair(e.pointerId, e.clientX, e.clientY);

    const longPressTimer = setTimeout(() => {
      const p = pointersRef.current.get(e.pointerId);
      if (!p || p.isSwiping || p.touchActive) return;
      const dist = Math.hypot(p.lastX - p.startX, p.lastY - p.startY);
      if (dist < TAP_MOVE_PX) {
        const pos = toDevice(p.startX, p.startY);
        if (pos) {
          try {
            navigator.vibrate?.(30);
          } catch {
            /* ignore */
          }
          sendDeviceInputFast(apiBaseUrl, inputTarget, "swipe", {
            x1: pos.x,
            y1: pos.y,
            x2: pos.x,
            y2: pos.y,
            duration: 500,
          });
          onAction?.();
        }
      }
    }, LONG_PRESS_MS);

    pointersRef.current.set(e.pointerId, {
      id: e.pointerId,
      pointerIndex,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      t: performance.now(),
      longPressTimer,
      isSwiping: false,
      touchActive: false,
      lastSentX: 0,
      lastSentY: 0,
      lastMoveSentAt: 0,
      downAck: false,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
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

    if (p.touchActive) {
      await endTouch(e.pointerId, e.clientX, e.clientY);
    } else if (!p.isSwiping && dist < TAP_MOVE_PX && dt < TAP_MS) {
      const pos = toDevice(p.startX, p.startY);
      if (pos) {
        showCrosshair(e.pointerId, p.startX, p.startY);
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
        } catch {
          /* tap failed */
        }
      }
    } else if (p.isSwiping && !p.touchActive) {
      const from = toDevice(p.startX, p.startY);
      const to = toDevice(e.clientX, e.clientY);
      if (from && to) {
        sendDeviceInputFast(apiBaseUrl, inputTarget, "swipe", {
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          duration: Math.max(50, Math.min(Math.round(dt), 350)),
        });
        onAction?.();
      }
    }

    pointersRef.current.delete(e.pointerId);
    pendingMovesRef.current.delete(e.pointerId);
    setCrosshairs((prev) => {
      const next = new Map(prev);
      next.delete(e.pointerId);
      return next;
    });
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
      const pos = toDevice(p.lastX, p.lastY);
      if (pos) {
        try {
          await sendTouch("up", pos.x, pos.y, p.pointerIndex, {
            awaitResponse: true,
          });
        } catch {
          /* ignore */
        }
      }
    }
    pointersRef.current.delete(e.pointerId);
    pendingMovesRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0 && moveRafRef.current != null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
  };

  return (
    <TouchOverlayView
      overlayRef={overlayRef}
      crosshairs={crosshairs}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}

function TouchOverlayView({
  overlayRef,
  crosshairs,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  crosshairs: Map<number, { x: number; y: number }>;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}) {
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
      {[...crosshairs.entries()].map(([id, pt]) => (
        <span
          key={id}
          className="pointer-events-none absolute z-20"
          style={{ left: pt.x, top: pt.y }}
        >
          <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border border-cyan-400/90 bg-cyan-400/20" />
          <span className="absolute left-0 top-0 h-px w-2 -translate-x-full bg-cyan-400/60" />
          <span className="absolute left-0 top-0 h-2 w-px -translate-y-full bg-cyan-400/60" />
        </span>
      ))}
    </div>
  );
}


