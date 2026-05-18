"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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

/** Gesture thresholds — tuned for Note 9 / iPad / desktop mouse alike. */
const TAP_MOVE_PX = 8;
const TAP_MS = 380;
const LONG_PRESS_MS = 480;
const MOVE_INTERVAL_MS = 8;
const SWIPE_START_PX_TOUCH = 3;
const SWIPE_START_PX_MOUSE = 4;
const CROSSHAIR_HIDE_MS = 260;
const MAX_POINTERS = 10;

type ActivePointer = {
  id: number;
  pointerIndex: number;
  pointerType: string;
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
  const crosshairLayerRef = useRef<HTMLDivElement>(null);

  /** Map<pointerId, ActivePointer> — minimal allocation on the hot path. */
  const pointers = useRef<Map<number, ActivePointer>>(new Map());
  const moveRafRef = useRef<number | null>(null);
  const pendingMoves = useRef<Map<number, { x: number; y: number }>>(new Map());

  /**
   * Crosshair DOM nodes are managed imperatively so dragging never triggers a
   * React re-render — that was the root cause of jittery / "wonky" touch.
   */
  const crosshairNodes = useRef<Map<number, HTMLSpanElement>>(new Map());
  const crosshairTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const inputTarget = useMemo<DeviceInputTarget>(
    () => ({ deviceId, deviceSerial }),
    [deviceId, deviceSerial],
  );

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

  /* ──────────────── Crosshair (imperative, no React state) ──────────────── */

  const removeCrosshair = useCallback((pointerId: number) => {
    const node = crosshairNodes.current.get(pointerId);
    if (node) {
      node.remove();
      crosshairNodes.current.delete(pointerId);
    }
    const timer = crosshairTimers.current.get(pointerId);
    if (timer) {
      clearTimeout(timer);
      crosshairTimers.current.delete(pointerId);
    }
  }, []);

  const ensureCrosshairNode = useCallback((pointerId: number) => {
    let node = crosshairNodes.current.get(pointerId);
    if (node) return node;
    const layer = crosshairLayerRef.current;
    if (!layer) return null;

    node = document.createElement("span");
    node.className = "pointer-events-none absolute z-20 will-change-transform";
    node.style.left = "0";
    node.style.top = "0";
    node.innerHTML = `
      <span style="position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:9999px;border:1px solid rgba(34,211,238,0.9);background:rgba(34,211,238,0.18)"></span>
      <span style="position:absolute;left:0;top:0;width:6px;height:1px;background:rgba(34,211,238,0.6);transform:translateX(-100%)"></span>
      <span style="position:absolute;left:0;top:0;width:1px;height:6px;background:rgba(34,211,238,0.6);transform:translateY(-100%)"></span>
      <span style="position:absolute;left:0;top:0;width:6px;height:1px;background:rgba(34,211,238,0.6)"></span>
      <span style="position:absolute;left:0;top:0;width:1px;height:6px;background:rgba(34,211,238,0.6)"></span>
    `;
    layer.appendChild(node);
    crosshairNodes.current.set(pointerId, node);
    return node;
  }, []);

  const moveCrosshair = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const layer = crosshairLayerRef.current;
      if (!layer) return;
      const rect = layer.getBoundingClientRect();
      const lx = clientX - rect.left;
      const ly = clientY - rect.top;
      const node = ensureCrosshairNode(pointerId);
      if (!node) return;
      node.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
      const existing = crosshairTimers.current.get(pointerId);
      if (existing) clearTimeout(existing);
      crosshairTimers.current.set(
        pointerId,
        setTimeout(() => removeCrosshair(pointerId), CROSSHAIR_HIDE_MS),
      );
    },
    [ensureCrosshairNode, removeCrosshair],
  );

  /* ──────────────── Send helpers ──────────────── */

  const sendTouch = useCallback(
    (action: "down" | "up" | "move", x: number, y: number, pointerIndex: number) => {
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
      const p = pointers.current.get(pointerId);
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
    const pending = pendingMoves.current;
    if (pending.size === 0) return;
    for (const [pointerId, pos] of pending) {
      flushTouchMove(pointerId, pos.x, pos.y);
    }
    pending.clear();
  }, [flushTouchMove]);

  const scheduleTouchMove = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      pendingMoves.current.set(pointerId, { x: clientX, y: clientY });
      if (moveRafRef.current == null) {
        moveRafRef.current = requestAnimationFrame(runMoveRaf);
      }
    },
    [runMoveRaf],
  );

  const beginTouchDrag = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const p = pointers.current.get(pointerId);
      if (!p || p.touchActive) return;
      const start = toDevice(p.startX, p.startY);
      if (!start) return;

      p.touchActive = true;
      p.isSwiping = true;
      p.lastSentX = start.x;
      p.lastSentY = start.y;
      p.lastMoveSentAt = 0;
      p.downAck = true;

      sendTouch("down", start.x, start.y, p.pointerIndex);

      const current = toDevice(clientX, clientY);
      if (current && (current.x !== start.x || current.y !== start.y)) {
        flushTouchMove(pointerId, clientX, clientY, true);
      }
    },
    [toDevice, sendTouch, flushTouchMove],
  );

  const endTouch = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const p = pointers.current.get(pointerId);
      if (!p?.touchActive) return;
      flushTouchMove(pointerId, clientX, clientY, true);
      const end = toDevice(clientX, clientY);
      if (end && p.downAck) {
        sendTouch("up", end.x, end.y, p.pointerIndex);
      }
      p.touchActive = false;
      p.downAck = false;
    },
    [flushTouchMove, toDevice, sendTouch],
  );

  /* ──────────────── Pointer event handlers ──────────────── */

  const allocPointerIndex = useCallback((): number => {
    const used = new Set<number>();
    for (const p of pointers.current.values()) used.add(p.pointerIndex);
    for (let i = 0; i < MAX_POINTERS; i++) {
      if (!used.has(i)) return i;
    }
    return 0;
  }, []);

  const processPointerMove = useCallback(
    (pointerId: number, clientX: number, clientY: number, pointerType: string) => {
      const p = pointers.current.get(pointerId);
      if (!p) return;
      p.lastX = clientX;
      p.lastY = clientY;

      const dist = Math.hypot(clientX - p.startX, clientY - p.startY);
      const startThreshold =
        pointerType === "mouse" ? SWIPE_START_PX_MOUSE : SWIPE_START_PX_TOUCH;

      if (!p.isSwiping && dist >= startThreshold) {
        if (p.longPressTimer) {
          clearTimeout(p.longPressTimer);
          p.longPressTimer = null;
        }
        beginTouchDrag(pointerId, clientX, clientY);
      }
      if (p.touchActive && p.downAck) {
        scheduleTouchMove(pointerId, clientX, clientY);
      }
      moveCrosshair(pointerId, clientX, clientY);
    },
    [beginTouchDrag, scheduleTouchMove, moveCrosshair],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    // Accept primary mouse button, all touches, and pen tip.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (pointers.current.has(e.pointerId)) return;
    if (pointers.current.size >= MAX_POINTERS) return;

    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const pointerIndex = allocPointerIndex();
    moveCrosshair(e.pointerId, e.clientX, e.clientY);

    const longPressTimer = setTimeout(() => {
      const p = pointers.current.get(e.pointerId);
      if (!p || p.isSwiping || p.touchActive) return;
      const dist = Math.hypot(p.lastX - p.startX, p.lastY - p.startY);
      if (dist >= TAP_MOVE_PX) return;
      const pos = toDevice(p.startX, p.startY);
      if (!pos) return;
      try {
        navigator.vibrate?.(25);
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
    }, LONG_PRESS_MS);

    pointers.current.set(e.pointerId, {
      id: e.pointerId,
      pointerIndex,
      pointerType: e.pointerType || "touch",
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
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    e.preventDefault();

    const native = e.nativeEvent as PointerEvent;
    const coalesced =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : null;
    if (coalesced && coalesced.length > 0) {
      for (const ev of coalesced) {
        processPointerMove(e.pointerId, ev.clientX, ev.clientY, p.pointerType);
      }
    } else {
      processPointerMove(e.pointerId, e.clientX, e.clientY, p.pointerType);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    e.preventDefault();

    if (p.longPressTimer) {
      clearTimeout(p.longPressTimer);
      p.longPressTimer = null;
    }

    const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
    const dt = performance.now() - p.t;

    if (p.touchActive) {
      endTouch(e.pointerId, e.clientX, e.clientY);
    } else if (!p.isSwiping && dist < TAP_MOVE_PX && dt < TAP_MS) {
      const pos = toDevice(p.startX, p.startY);
      if (pos) {
        moveCrosshair(e.pointerId, p.startX, p.startY);
        try {
          navigator.vibrate?.(6);
        } catch {
          /* ignore */
        }
        sendDeviceInputFast(apiBaseUrl, inputTarget, "tap", {
          x: pos.x,
          y: pos.y,
        });
        onAction?.();
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

    pointers.current.delete(e.pointerId);
    pendingMoves.current.delete(e.pointerId);
    if (pointers.current.size === 0 && moveRafRef.current != null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    if (p.longPressTimer) {
      clearTimeout(p.longPressTimer);
      p.longPressTimer = null;
    }
    if (p.touchActive && p.downAck) {
      const pos = toDevice(p.lastX, p.lastY);
      if (pos) {
        sendTouch("up", pos.x, pos.y, p.pointerIndex);
      }
    }
    removeCrosshair(e.pointerId);
    pointers.current.delete(e.pointerId);
    pendingMoves.current.delete(e.pointerId);
    if (pointers.current.size === 0 && moveRafRef.current != null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
  };

  /* ──────────────── Side effects ──────────────── */

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    // Block browser gestures (pinch-zoom on iOS, double-tap zoom) without
    // affecting our own pointer event handlers.
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

  useEffect(() => {
    return () => {
      for (const timer of crosshairTimers.current.values()) clearTimeout(timer);
      crosshairTimers.current.clear();
      crosshairNodes.current.clear();
      if (moveRafRef.current != null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10 cursor-crosshair touch-none select-none"
      style={{
        touchAction: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        ref={crosshairLayerRef}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      />
    </div>
  );
}
