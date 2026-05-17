"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Expand, Home, PauseCircle, RotateCcw, Square } from "lucide-react";
import type { Session } from "@/types/session";
import { H264Player, type H264PlayerHandle } from "@/components/h264-player";
import { formatDurationThai } from "@boxphon/shared/client/format-duration";
import { getServerNow } from "@boxphon/shared/client/server-time";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/$/, "");

const KEY = { BACK: 4, HOME: 3, RECENTS: 187 };

type StreamingMode = "scrcpy" | "screenshot";

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
      ...(csrf && { "X-CSRF-Token": csrf }),
    },
    credentials: "include",
    body: JSON.stringify({ type, payload }),
  }).then(async (res) => {
    if (!res.ok) {
      let message = `Input failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.message) {
          message = String(data.message);
        }
      } catch {
        // ignore non-JSON response
      }
      throw new Error(message);
    }
    return res;
  });
}

/** Map browser client coords → ADB tap coords using the visible video/canvas rect. */
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

function TouchOverlay({
  deviceId,
  getNaturalSize,
  getVideoElement,
  onAction,
}: {
  deviceId: string;
  getNaturalSize: () => { width: number; height: number };
  getVideoElement: () => HTMLElement | null;
  onAction: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const activePtr = useRef<{
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
    (clientX: number, clientY: number) =>
      clientToDevice(clientX, clientY, getVideoElement(), getNaturalSize()),
    [getNaturalSize, getVideoElement],
  );

  const showCrosshair = (clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCrosshair({ x: clientX - rect.left, y: clientY - rect.top });
    if (crosshairTimer.current) clearTimeout(crosshairTimer.current);
    crosshairTimer.current = setTimeout(() => setCrosshair(null), 600);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (activePtr.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    showCrosshair(e.clientX, e.clientY);

    const longPressTimer = setTimeout(() => {
      const p = activePtr.current;
      if (!p) return;
      const dist = Math.hypot(p.lastX - p.startX, p.lastY - p.startY);
      if (dist < TAP_MOVE_PX) {
        const pos = toDevice(p.startX, p.startY);
        if (pos) {
          try { navigator.vibrate?.(30); } catch { /* ignore */ }
          sendInput(deviceId, "swipe", {
            x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, duration: 600,
          }).then(() => onAction());
        }
      }
    }, LONG_PRESS_MS);

    activePtr.current = {
      id: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      lastX: e.clientX,  lastY: e.clientY,
      t: Date.now(),
      longPressTimer,
      isSwiping: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = activePtr.current;
    if (!p || p.id !== e.pointerId) return;
    const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
    if (!p.isSwiping && dist >= TAP_MOVE_PX) {
      if (p.longPressTimer) { clearTimeout(p.longPressTimer); p.longPressTimer = null; }
      p.isSwiping = true;
    }
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    showCrosshair(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = activePtr.current;
    if (!p || p.id !== e.pointerId) return;
    if (p.longPressTimer) { clearTimeout(p.longPressTimer); p.longPressTimer = null; }
    activePtr.current = null;

    const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
    const dt = Date.now() - p.t;

    if (!p.isSwiping && dist < TAP_MOVE_PX && dt < TAP_MS) {
      const pos = toDevice(p.startX, p.startY);
      if (pos) {
        showCrosshair(p.startX, p.startY);
        try { navigator.vibrate?.(8); } catch { /* ignore */ }
        sendInput(deviceId, "tap", { x: pos.x, y: pos.y }).then(() => onAction());
      }
    } else if (p.isSwiping) {
      const from = toDevice(p.startX, p.startY);
      const to = toDevice(e.clientX, e.clientY);
      if (from && to) {
        sendInput(deviceId, "swipe", {
          x1: from.x, y1: from.y,
          x2: to.x,   y2: to.y,
          duration: Math.max(60, Math.min(dt, 600)),
        }).then(() => onAction());
      }
    }
  };

  const onPointerCancel = () => {
    if (activePtr.current?.longPressTimer) clearTimeout(activePtr.current.longPressTimer);
    activePtr.current = null;
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 cursor-crosshair select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
    >
      {crosshair && (
        <span
          className="pointer-events-none absolute z-20"
          style={{ left: crosshair.x, top: crosshair.y }}
        >
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border-2 border-cyan-400/90 bg-cyan-400/25" />
          <span className="absolute left-0 top-0 h-px w-3 -translate-x-full bg-cyan-400/70" />
          <span className="absolute left-0 top-0 h-3 w-px -translate-y-full bg-cyan-400/70" />
          <span className="absolute left-0 top-0 h-px w-3 bg-cyan-400/70" />
          <span className="absolute left-0 top-0 h-3 w-px bg-cyan-400/70" />
        </span>
      )}
    </div>
  );
}

interface SessionPhoneControlProps {
  session: Session;
  variant?: "default" | "expanded";
  onExpand?: () => void;
  /** When true, don't render the H264Player (use when this card is covered by
   *  an expanded overlay to avoid two decoders competing for the same stream) */
  suppressStream?: boolean;
  /** Server-corrected epoch_ms of when session data was last fetched from the
   *  API.  The backend computes remaining_seconds as-of the response time, so
   *  we subtract elapsed since fetchedAt (not since start/resume_time which
   *  would double-count the already-elapsed portion). */
  fetchedAt?: number;
}

export function SessionPhoneControl({
  session,
  variant = "default",
  onExpand,
  suppressStream = false,
  fetchedAt,
}: SessionPhoneControlProps) {
  const [now, setNow] = useState(() => getServerNow());
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [screenAspectRatio, setScreenAspectRatio] = useState(1080 / 2340);
  const [streamingMode, setStreamingMode] = useState<"unknown" | StreamingMode>(
    "unknown",
  );
  const imgRef = useRef<HTMLImageElement | null>(null);
  const h264PlayerRef = useRef<H264PlayerHandle>(null);
  const imgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgSrcRef = useRef<string | null>(null);
  const refreshSeqRef = useRef(0);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const consecutiveFailureRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(getServerNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect streaming capability (feature flag) — fetched once on mount.
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE_URL}/devices/streaming-mode`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const supportsWebCodecs =
          typeof window !== "undefined" && "VideoDecoder" in window;
        if (data?.mode === "scrcpy" && supportsWebCodecs) {
          setStreamingMode("scrcpy");
        } else {
          setStreamingMode("screenshot");
        }
      })
      .catch(() => {
        if (!cancelled) setStreamingMode("screenshot");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const deviceId = session.device_id?._id;
  const deviceSerial = session.device_id?.serial_number;
  const refreshScreenshot = useCallback(() => {
    if (!deviceId) return;
    const seq = ++refreshSeqRef.current;
    refreshAbortRef.current?.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;

    fetch(`${BASE_URL}/devices/${deviceId}/screenshot`, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((blob) => {
        if (seq !== refreshSeqRef.current) return;
        const url = URL.createObjectURL(blob);
        setImgSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          imgSrcRef.current = url;
          return url;
        });
        consecutiveFailureRef.current = 0;
        setImgError(false);
      })
      .catch(() => {
        if (controller.signal.aborted || seq !== refreshSeqRef.current) return;
        consecutiveFailureRef.current += 1;
        // Keep showing last frame during transient backend/network glitches.
        if (!imgSrcRef.current || consecutiveFailureRef.current >= 3) {
          setImgError(true);
        }
      });
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    // Skip legacy polling when scrcpy stream takes over the display.
    if (streamingMode === "scrcpy") return;
    if (streamingMode === "unknown") return;
    setImgError(false);
    consecutiveFailureRef.current = 0;
    refreshScreenshot();
    imgTimerRef.current = setInterval(refreshScreenshot, 2000);
    return () => {
      if (imgTimerRef.current) clearInterval(imgTimerRef.current);
      refreshAbortRef.current?.abort();
    };
  }, [deviceId, refreshScreenshot, streamingMode]);

  useEffect(() => {
    imgSrcRef.current = imgSrc;
  }, [imgSrc]);

  useEffect(() => {
    return () => {
      refreshAbortRef.current?.abort();
      if (imgSrcRef.current) {
        URL.revokeObjectURL(imgSrcRef.current);
      }
    };
  }, []);

  const handleActionRefresh = useCallback(() => {
    // scrcpy stream auto-updates; no need to force a refresh after touch input.
    if (streamingMode === "scrcpy") return;
    setTimeout(() => refreshScreenshot(), 400);
  }, [refreshScreenshot, streamingMode]);

  const getNaturalSize = useCallback(() => {
    if (streamingMode === "scrcpy" && h264PlayerRef.current) {
      return h264PlayerRef.current.getNaturalSize();
    }
    const img = imgRef.current;
    return {
      width: img && img.naturalWidth > 0 ? img.naturalWidth : 0,
      height: img && img.naturalHeight > 0 ? img.naturalHeight : 0,
    };
  }, [streamingMode]);

  const getVideoElement = useCallback((): HTMLElement | null => {
    if (streamingMode === "scrcpy" && h264PlayerRef.current) {
      return h264PlayerRef.current.getCanvas();
    }
    return imgRef.current;
  }, [streamingMode]);

  // The backend computes remaining_seconds as-of the API response time.
  // We subtract elapsed time since fetchedAt (when we received that response),
  // NOT since resume_time (which would double-count elapsed seconds already
  // baked into the server's remaining_seconds value).
  let remaining = session.remaining_seconds;
  if (session.status === "ACTIVE" && fetchedAt) {
    remaining = Math.max(
      0,
      session.remaining_seconds - Math.floor((now - fetchedAt) / 1000),
    );
  }
  const isPaused = session.status === "PAUSED";
  const expired = session.status === "EXPIRED" || remaining <= 0;
  const streamActive = !expired && !isPaused;
  const isExpanded = variant === "expanded";

  return (
    <div
      className={`flex shrink-0 flex-col ${isExpanded ? "w-auto max-w-[min(90vw,520px)]" : "w-full max-w-[220px]"}`}
    >
      {/* ── header bar ── */}
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
        <span className="truncate text-sm font-semibold text-white">
          {session.device_id?.name || "Device"}
        </span>
        <div className="flex items-center gap-2">
          {!isExpanded && onExpand && streamActive && (
            <button
              type="button"
              onClick={onExpand}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-800/70 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              aria-label="ขยายจอ"
              title="ขยายจอ"
            >
              <Expand className="h-4 w-4" />
            </button>
          )}
          {isPaused && (
            <PauseCircle className="h-4 w-4 text-amber-400" />
          )}
          <div
            className={`flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums ${
              expired ? "text-red-400" : isPaused ? "text-amber-400" : "text-cyan-400"
            }`}
          >
            {formatDurationThai(remaining)}
          </div>
        </div>
      </div>

      {/* ── phone frame ── */}
      <div className="relative mx-auto w-full">
        <div
          className={`relative mx-auto overflow-hidden rounded-[2.25rem] border-4 border-slate-700 bg-slate-900 shadow-2xl shadow-cyan-900/20 ${
            isExpanded ? "w-auto max-w-[min(90vw,500px)]" : "w-full"
          }`}
          style={{
            aspectRatio: String(screenAspectRatio),
            isolation: "isolate",
            userSelect: "none",
            WebkitUserSelect: "none",
            // Leave room for header bar (~52px), nav buttons (~76px), close btn
            // (~44px), overlay padding (~32px) → cap at ~75vh or 680px
            ...(isExpanded
              ? { maxHeight: "min(75vh, 680px)", height: "min(75vh, 680px)" }
              : {}),
          } as React.CSSProperties}
        >
          {/* ── stream layer ── */}
          {streamingMode === "scrcpy" && deviceSerial && streamActive && !suppressStream ? (
            <H264Player
              ref={h264PlayerRef}
              deviceSerial={deviceSerial}
              className="absolute inset-0"
              onMetadata={(m) => {
                if (m.width > 0 && m.height > 0) {
                  setScreenAspectRatio(m.width / m.height);
                }
              }}
            />
          ) : streamingMode === "screenshot" && imgSrc && !imgError && streamActive ? (
            <img
              ref={imgRef}
              src={imgSrc}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth > 0 && naturalHeight > 0) {
                  setScreenAspectRatio(naturalWidth / naturalHeight);
                }
              }}
              draggable={false}
            />
          ) : !isPaused && !expired ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
              <div
                className={`h-10 w-10 rounded-full border-4 border-cyan-500 ${imgError ? "opacity-30" : "border-t-transparent animate-spin"}`}
              />
              <span className="text-xs text-slate-400">
                {imgError
                  ? "ไม่สามารถโหลดภาพได้"
                  : streamingMode === "unknown"
                    ? "กำลังตรวจสอบโหมด..."
                    : "กำลังโหลดหน้าจอ..."}
              </span>
            </div>
          ) : null}

          {/* ── touch overlay (only when actively streaming) ── */}
          {streamActive && deviceId && (
            <TouchOverlay
              deviceId={deviceId}
              getNaturalSize={getNaturalSize}
              getVideoElement={getVideoElement}
              onAction={handleActionRefresh}
            />
          )}

          {/* ── paused overlay ── */}
          {isPaused && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/90">
              <PauseCircle className="h-10 w-10 text-amber-400 opacity-80" />
              <span className="text-sm font-semibold text-amber-300">
                หยุดชั่วคราว
              </span>
              <span className="text-xs text-slate-400">
                {formatDurationThai(remaining)} คงเหลือ
              </span>
            </div>
          )}

          {/* ── expired overlay ── */}
          {expired && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80">
              <span className="text-lg font-bold text-red-400">
                หมดเวลาใช้งาน
              </span>
            </div>
          )}
        </div>

        {/* ── Android nav buttons (Back / Home / Recents) ── */}
        {streamActive && deviceId && (
          <div className="mt-4 flex justify-around px-2">
            {[
              { icon: <RotateCcw className="h-5 w-5" />, key: KEY.BACK,    label: "Back"    },
              { icon: <Home       className="h-5 w-5" />, key: KEY.HOME,    label: "Home"    },
              { icon: <Square     className="h-5 w-5" />, key: KEY.RECENTS, label: "Recents" },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                aria-label={btn.label}
                onClick={() => {
                  sendInput(deviceId, "key", { keycode: btn.key }).then(() =>
                    handleActionRefresh(),
                  );
                }}
                className="flex flex-col items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white active:bg-slate-600"
              >
                {btn.icon}
                <span className="text-[9px] text-slate-500">{btn.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
