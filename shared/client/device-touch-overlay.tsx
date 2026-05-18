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

/** Tap vs drag thresholds — tuned for Galaxy Note / Samsung / iPad. */
const TAP_MOVE_PX = 12;
const TAP_MS = 420;
const LONG_PRESS_MS = 450;
const MOVE_INTERVAL_MS = 12;
const SWIPE_START_PX = 4;

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
  const pointerRef = useRef<{
    id: number;
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
  } | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{ x: number; y: number } | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(
    null,
  );
  const crosshairTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputTarget: DeviceInputTarget = { deviceId, deviceSerial };
  const swipeStartPx = isCoarsePointer() ? SWIPE_START_PX : 6;

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

  /** Map click position → ADB coords using the visible video/canvas element. */
  const toDevice = useCallback(
    (clientX: number, clientY: number) => {
      const el = getVideoElement() ?? overlayRef.current;
      const natural = getNaturalSize();
      const video = resolveVideoSize();
      if (natural.width <= 0 || natural.height <= 0) return null;
      return mapClientToDevice(clientX, clientY, el, video, natural);
    },
    [getVideoElement, resolveVideoSize, getNaturalSize],
  );

  const showCrosshair = useCallback((clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCrosshair({ x: clientX - rect.left, y: clientY - rect.top });
    if (crosshairTimer.current) clearTimeout(crosshairTimer.current);
    crosshairTimer.current = setTimeout(() => setCrosshair(null), 350);
  }, []);

  const sendTouch = useCallback(
    (
      action: "down" | "up" | "move",
      x: number,
      y: number,
      opts?: { awaitResponse?: boolean },
    ) => {
      sendDeviceInputFast(
        apiBaseUrl,
        inputTarget,
        "touch",
        { action, x, y, pointerId: 0 },
        opts,
      );
    },
    [apiBaseUrl, inputTarget],
  );

  const flushTouchMove = useCallback(
    (clientX: number, clientY: number, force = false) => {
      const p = pointerRef.current;
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
      sendTouch("move", pos.x, pos.y);
    },
    [sendTouch, toDevice],
  );

  const runMoveRaf = useCallback(() => {
    moveRafRef.current = null;
    const pending = pendingMoveRef.current;
    if (!pending) return;
    pendingMoveRef.current = null;
    flushTouchMove(pending.x, pending.y);
  }, [flushTouchMove]);

  const scheduleTouchMove = useCallback(
    (clientX: number, clientY: number) => {
      pendingMoveRef.current = { x: clientX, y: clientY };
      if (moveRafRef.current == null) {
        moveRafRef.current = requestAnimationFrame(runMoveRaf);
      }
    },
    [runMoveRaf],
  );

  const beginTouchDrag = useCallback(
    async (clientX: number, clientY: number) => {
      const p = pointerRef.current;
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
        await sendTouch("down", start.x, start.y, { awaitResponse: true });
        p.downAck = true;
      } catch {
        p.touchActive = false;
        p.isSwiping = false;
        return;
      }

      const current = toDevice(clientX, clientY);
      if (current && (current.x !== start.x || current.y !== start.y)) {
        flushTouchMove(clientX, clientY, true);
      }
    },
    [toDevice, sendTouch, flushTouchMove],
  );

  const endTouch = useCallback(
    async (clientX: number, clientY: number) => {
      const p = pointerRef.current;
      if (!p?.touchActive) return;

      flushTouchMove(clientX, clientY, true);
      const end = toDevice(clientX, clientY);
      if (end && p.downAck) {
        try {
          await sendTouch("up", end.x, end.y, { awaitResponse: true });
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
    (clientX: number, clientY: number) => {
      const p = pointerRef.current;
      if (!p) return;

      p.lastX = clientX;
      p.lastY = clientY;

      const dist = Math.hypot(clientX - p.startX, clientY - p.startY);

      if (!p.isSwiping && dist >= swipeStartPx) {
        if (p.longPressTimer) {
          clearTimeout(p.longPressTimer);
          p.longPressTimer = null;
        }
        void beginTouchDrag(clientX, clientY);
      }

      if (p.touchActive && p.downAck) {
        scheduleTouchMove(clientX, clientY);
      }

      showCrosshair(clientX, clientY);
    },
    [beginTouchDrag, scheduleTouchMove, showCrosshair, swipeStartPx],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (pointerRef.current) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    showCrosshair(e.clientX, e.clientY);

    const longPressTimer = setTimeout(() => {
      const p = pointerRef.current;
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

    pointerRef.current = {
      id: e.pointerId,
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
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;

    e.preventDefault();

    const coalesced =
      typeof e.getCoalescedEvents === "function"
        ? e.getCoalescedEvents()
        : [e];

    for (const ev of coalesced) {
      processPointerMove(ev.clientX, ev.clientY);
    }
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;

    e.preventDefault();
    if (p.longPressTimer) {
      clearTimeout(p.longPressTimer);
      p.longPressTimer = null;
    }

    const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
    const dt = performance.now() - p.t;

    if (p.touchActive) {
      await endTouch(e.clientX, e.clientY);
    } else if (!p.isSwiping && dist < TAP_MOVE_PX && dt < TAP_MS) {
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

    pointerRef.current = null;
    pendingMoveRef.current = null;
    if (moveRafRef.current != null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
  };

  const onPointerCancel = async (e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p) return;
    if (p.longPressTimer) clearTimeout(p.longPressTimer);
    if (p.touchActive && p.downAck) {
      const pos = toDevice(p.lastX, p.lastY);
      if (pos) {
        try {
          await sendTouch("up", pos.x, pos.y, { awaitResponse: true });
        } catch {
          /* ignore */
        }
      }
    }
    pointerRef.current = null;
    pendingMoveRef.current = null;
    if (moveRafRef.current != null) {
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
        >
          <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border border-cyan-400/90 bg-cyan-400/20" />
          <span className="absolute left-0 top-0 h-px w-2 -translate-x-full bg-cyan-400/60" />
          <span className="absolute left-0 top-0 h-2 w-px -translate-y-full bg-cyan-400/60" />
        </span>
      )}
    </div>
  );
}
