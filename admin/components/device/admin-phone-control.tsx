"use client";

/**
 * AdminPhoneControl — scrcpy H.264 stream + full touch control for admin.
 *
 * Touch features:
 * - Tap     : press & release < 14px movement, < 450ms
 * - Long press: hold > 450ms without movement → adb input swipe (in-place for Android long-press)
 * - Swipe   : pointermove tracking — sends swipe continuously in real time
 * - Fallback: screenshot polling if WebCodecs / scrcpy unavailable
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AdminH264Player,
  type AdminH264PlayerHandle,
  type AdminH264PlayerMeta,
} from "./admin-h264-player";
import { BASE_URL } from "@/services/api";
import { RefreshCw } from "lucide-react";

/* ─── ADB input helper ─── */

function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(^|\s)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[2].trim()) : null;
}

async function sendInput(
  deviceId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  const csrf = getCsrfToken();
  return fetch(`${BASE_URL}/devices/${deviceId}/input`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ type, payload }),
  });
}

/* ─── coordinate mapping ─── */

function clientToDevice(
  clientX: number,
  clientY: number,
  videoEl: HTMLElement | null,
  deviceSize: { width: number; height: number },
): { x: number; y: number } | null {
  const rect = videoEl?.getBoundingClientRect();
  if (!rect || rect.width < 2 || rect.height < 2) return null;
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
  const dw = deviceSize.width > 0 ? deviceSize.width : 1080;
  const dh = deviceSize.height > 0 ? deviceSize.height : 2340;
  return {
    x: Math.round(Math.max(0, Math.min(1, nx)) * dw),
    y: Math.round(Math.max(0, Math.min(1, ny)) * dh),
  };
}

/* ─── TouchOverlay (admin) ─── */

interface TouchOverlayProps {
  deviceId: string;
  getNaturalSize: () => { width: number; height: number };
  getVideoElement: () => HTMLElement | null;
}

function TouchOverlay({ deviceId, getNaturalSize, getVideoElement }: TouchOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{
    id: number;
    startX: number; startY: number;
    lastX: number;  lastY: number;
    t: number;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    isSwiping: boolean;
  } | null>(null);

  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const crosshairTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TAP_MOVE_PX = 12;
  const TAP_MS = 420;
  const LONG_PRESS_MS = 500;

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const blockScroll = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchstart", blockScroll, { passive: false });
    return () => el.removeEventListener("touchstart", blockScroll);
  }, []);

  const toDevice = useCallback(
    (cx: number, cy: number) => clientToDevice(cx, cy, getVideoElement(), getNaturalSize()),
    [getNaturalSize, getVideoElement],
  );

  const showCrosshair = (clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCrosshair({ x: clientX - rect.left, y: clientY - rect.top });
    if (crosshairTimer.current) clearTimeout(crosshairTimer.current);
    crosshairTimer.current = setTimeout(() => setCrosshair(null), 600);
  };

  /* ── pointer down ── */
  const onPointerDown = (e: React.PointerEvent) => {
    if (pointerRef.current) return; // only track first pointer
    e.currentTarget.setPointerCapture(e.pointerId);

    showCrosshair(e.clientX, e.clientY);

    const longPressTimer = setTimeout(() => {
      const p = pointerRef.current;
      if (!p) return;
      const dist = Math.hypot(p.lastX - p.startX, p.lastY - p.startY);
      if (dist < TAP_MOVE_PX) {
        // Long press — fire as in-place swipe (Android interprets as long-press)
        const pos = toDevice(p.startX, p.startY);
        if (pos) {
          try { navigator.vibrate?.(30); } catch { /* ignore */ }
          sendInput(deviceId, "swipe", {
            x1: pos.x, y1: pos.y,
            x2: pos.x, y2: pos.y,
            duration: 600,
          });
        }
      }
    }, LONG_PRESS_MS);

    pointerRef.current = {
      id: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      lastX: e.clientX,  lastY: e.clientY,
      t: Date.now(),
      longPressTimer,
      isSwiping: false,
    };
  };

  /* ── pointer move — real-time swipe tracking ── */
  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;

    const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);

    if (!p.isSwiping && dist >= TAP_MOVE_PX) {
      // Clear long-press — user is dragging
      if (p.longPressTimer) { clearTimeout(p.longPressTimer); p.longPressTimer = null; }
      p.isSwiping = true;
    }

    p.lastX = e.clientX;
    p.lastY = e.clientY;
    showCrosshair(e.clientX, e.clientY);
  };

  /* ── pointer up ── */
  const onPointerUp = (e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;

    if (p.longPressTimer) { clearTimeout(p.longPressTimer); p.longPressTimer = null; }
    pointerRef.current = null;

    const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
    const dt = Date.now() - p.t;

    if (!p.isSwiping && dist < TAP_MOVE_PX && dt < TAP_MS) {
      // Tap — use press position (more accurate than release)
      const pos = toDevice(p.startX, p.startY);
      if (pos) {
        try { navigator.vibrate?.(8); } catch { /* ignore */ }
        sendInput(deviceId, "tap", { x: pos.x, y: pos.y });
      }
    } else if (p.isSwiping) {
      const from = toDevice(p.startX, p.startY);
      const to = toDevice(e.clientX, e.clientY);
      if (from && to) {
        sendInput(deviceId, "swipe", {
          x1: from.x, y1: from.y,
          x2: to.x,   y2: to.y,
          duration: Math.max(60, Math.min(dt, 600)),
        });
      }
    }
  };

  const onPointerCancel = () => {
    if (pointerRef.current?.longPressTimer) clearTimeout(pointerRef.current.longPressTimer);
    pointerRef.current = null;
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 cursor-crosshair select-none z-10"
      style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {crosshair && (
        <span
          className="pointer-events-none absolute"
          style={{ left: crosshair.x, top: crosshair.y }}
        >
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border-2 border-cyan-400/90 bg-cyan-400/20" />
          <span className="absolute left-0 top-0 h-px w-3 -translate-x-full bg-cyan-400/70" />
          <span className="absolute left-0 top-0 h-3 w-px -translate-y-full bg-cyan-400/70" />
          <span className="absolute left-0 top-0 h-px w-3 bg-cyan-400/70" />
          <span className="absolute left-0 top-0 h-3 w-px bg-cyan-400/70" />
        </span>
      )}
    </div>
  );
}

/* ─── AdminPhoneControl ─── */

export interface AdminPhoneControlProps {
  deviceId: string;
  deviceSerial?: string;
  deviceStatus: "in-use" | "available" | "error" | "maintenance";
  className?: string;
}

export function AdminPhoneControl({
  deviceId,
  deviceSerial,
  deviceStatus,
  className = "",
}: AdminPhoneControlProps) {
  const playerRef = useRef<AdminH264PlayerHandle>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [streamingMode, setStreamingMode] = useState<"unknown" | "scrcpy" | "screenshot">("unknown");
  const [aspectRatio, setAspectRatio] = useState(9 / 16);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const imgSeqRef = useRef(0);
  const imgAbortRef = useRef<AbortController | null>(null);
  const imgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canStream = deviceStatus !== "maintenance" && deviceStatus !== "error";

  /* detect streaming mode once */
  useEffect(() => {
    if (!canStream) { setStreamingMode("screenshot"); return; }
    let cancelled = false;
    fetch(`${BASE_URL}/devices/streaming-mode`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const supportsWebCodecs = typeof window !== "undefined" && "VideoDecoder" in window;
        setStreamingMode(data?.mode === "scrcpy" && supportsWebCodecs ? "scrcpy" : "screenshot");
      })
      .catch(() => { if (!cancelled) setStreamingMode("screenshot"); });
    return () => { cancelled = true; };
  }, [canStream]);

  /* screenshot polling (fallback) */
  const fetchScreenshot = useCallback(() => {
    if (!deviceId || !canStream) return;
    const seq = ++imgSeqRef.current;
    imgAbortRef.current?.abort();
    const ctrl = new AbortController();
    imgAbortRef.current = ctrl;
    fetch(`${BASE_URL}/devices/${deviceId}/screenshot`, {
      credentials: "include",
      cache: "no-store",
      signal: ctrl.signal,
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => {
        if (seq !== imgSeqRef.current) return;
        const url = URL.createObjectURL(blob);
        setImgSrc((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
        setImgError(false);
      })
      .catch(() => { if (!ctrl.signal.aborted && seq === imgSeqRef.current) setImgError(true); });
  }, [deviceId, canStream]);

  useEffect(() => {
    if (streamingMode !== "screenshot" || !canStream) return;
    fetchScreenshot();
    imgTimerRef.current = setInterval(fetchScreenshot, 4000);
    return () => {
      if (imgTimerRef.current) clearInterval(imgTimerRef.current);
      imgAbortRef.current?.abort();
    };
  }, [streamingMode, fetchScreenshot, canStream]);

  const getNaturalSize = useCallback(() => {
    if (streamingMode === "scrcpy" && playerRef.current) {
      return playerRef.current.getNaturalSize();
    }
    const img = imgRef.current;
    return {
      width: img?.naturalWidth || 0,
      height: img?.naturalHeight || 0,
    };
  }, [streamingMode]);

  const getVideoElement = useCallback((): HTMLElement | null => {
    if (streamingMode === "scrcpy" && playerRef.current) {
      return playerRef.current.getCanvas();
    }
    return imgRef.current ?? null;
  }, [streamingMode]);

  const handleMetadata = (m: AdminH264PlayerMeta) => {
    if (m.width > 0 && m.height > 0) setAspectRatio(m.width / m.height);
  };

  return (
    <div
      className={`relative overflow-hidden bg-black rounded-xl ${className}`}
      style={{ aspectRatio: String(aspectRatio) }}
    >
      {!canStream ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-neutral-400">ไม่สามารถดึงหน้าจอได้</span>
        </div>
      ) : streamingMode === "scrcpy" && deviceSerial ? (
        <AdminH264Player
          ref={playerRef}
          deviceSerial={deviceSerial}
          className="absolute inset-0"
          onMetadata={handleMetadata}
        />
      ) : streamingMode === "screenshot" && imgSrc && !imgError ? (
        <img
          ref={imgRef}
          src={imgSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (naturalWidth > 0 && naturalHeight > 0) setAspectRatio(naturalWidth / naturalHeight);
          }}
          draggable={false}
        />
      ) : streamingMode === "unknown" || (streamingMode === "screenshot" && !imgSrc && !imgError) ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-neutral-500" />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="text-xs text-neutral-400 text-center px-2">
            {imgError ? "ไม่สามารถดึงหน้าจอได้" : "กำลังโหลด..."}
          </span>
        </div>
      )}

      {/* Touch overlay — only when streaming */}
      {canStream && streamingMode !== "unknown" && deviceId && (
        <TouchOverlay
          deviceId={deviceId}
          getNaturalSize={getNaturalSize}
          getVideoElement={getVideoElement}
        />
      )}
    </div>
  );
}
