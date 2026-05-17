"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Expand, Home, RotateCcw, Square } from "lucide-react";
import type { Session } from "@/types/session";
import { H264Player, type H264PlayerHandle } from "@/components/h264-player";

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

function getAccessToken() {
  if (typeof document === "undefined") return null;
  const tokenMatch = document.cookie
    .split("; ")
    .find((row) => row.startsWith("access_token="));
  return tokenMatch ? decodeURIComponent(tokenMatch.split("=")[1]) : null;
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

function TouchOverlay({
  deviceId,
  getNaturalSize,
  onAction,
}: {
  deviceId: string;
  /** คืนค่า dimensions ของจอ Android จริง (px). 0 = ยังไม่ทราบ → fallback 1080x2340 */
  getNaturalSize: () => { width: number; height: number };
  onAction: () => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(
    null,
  );
  const [ripple, setRipple] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const rippleId = useRef(0);

  const toAndroid = useCallback(
    (clientX: number, clientY: number) => {
      const rect = divRef.current!.getBoundingClientRect();
      const size = getNaturalSize();
      const nW = size.width > 0 ? size.width : 1080;
      const nH = size.height > 0 ? size.height : 2340;
      const containerAspect = rect.width / rect.height;
      const imageAspect = nW / nH;

      let displayedWidth = rect.width;
      let displayedHeight = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (imageAspect > containerAspect) {
        displayedHeight = rect.width / imageAspect;
        offsetY = (rect.height - displayedHeight) / 2;
      } else {
        displayedWidth = rect.height * imageAspect;
        offsetX = (rect.width - displayedWidth) / 2;
      }

      const normalizedX = (clientX - rect.left - offsetX) / displayedWidth;
      const normalizedY = (clientY - rect.top - offsetY) / displayedHeight;

      return {
        x: Math.max(0, Math.min(1, normalizedX)) * nW,
        y: Math.max(0, Math.min(1, normalizedY)) * nH,
      };
    },
    [getNaturalSize],
  );

  const showRipple = (clientX: number, clientY: number) => {
    const rect = divRef.current!.getBoundingClientRect();
    const id = ++rippleId.current;
    setRipple({ x: clientX - rect.left, y: clientY - rect.top, id });
    setTimeout(() => setRipple((r) => (r?.id === id ? null : r)), 400);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!touchStartRef.current) return;
    const { x: sx, y: sy, t } = touchStartRef.current;
    touchStartRef.current = null;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    const dist = Math.hypot(dx, dy);
    const dt = Date.now() - t;

    if (dist < 10 && dt < 400) {
      const pos = toAndroid(e.clientX, e.clientY);
      showRipple(e.clientX, e.clientY);
      sendInput(deviceId, "tap", { x: pos.x, y: pos.y }).then(() => onAction());
    } else if (dist >= 10) {
      const from = toAndroid(sx, sy);
      const to = toAndroid(e.clientX, e.clientY);
      sendInput(deviceId, "swipe", {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        duration: Math.min(dt, 600),
      }).then(() => onAction());
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const { x: sx, y: sy, t: st } = touchStartRef.current;
    touchStartRef.current = null;

    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    const dist = Math.hypot(dx, dy);
    const dt = Date.now() - st;

    if (dist < 15 && dt < 500) {
      const pos = toAndroid(t.clientX, t.clientY);
      showRipple(t.clientX, t.clientY);
      sendInput(deviceId, "tap", { x: pos.x, y: pos.y }).then(() => onAction());
    } else {
      const from = toAndroid(sx, sy);
      const to = toAndroid(t.clientX, t.clientY);
      sendInput(deviceId, "swipe", {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        duration: Math.min(dt, 600),
      }).then(() => onAction());
    }
  };

  return (
    <div
      ref={divRef}
      className="absolute inset-0 cursor-pointer select-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {ripple && (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/40 animate-ping"
          style={{
            left: ripple.x - 20,
            top: ripple.y - 20,
            width: 40,
            height: 40,
          }}
        />
      )}
    </div>
  );
}

interface SessionPhoneControlProps {
  session: Session;
  variant?: "default" | "expanded";
  onExpand?: () => void;
}

export function SessionPhoneControl({
  session,
  variant = "default",
  onExpand,
}: SessionPhoneControlProps) {
  const [now, setNow] = useState(Date.now());
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [screenAspectRatio, setScreenAspectRatio] = useState(1080 / 2340);
  const [streamingMode, setStreamingMode] = useState<"unknown" | StreamingMode>(
    "unknown",
  );
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const h264PlayerRef = useRef<H264PlayerHandle>(null);
  const imgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgSrcRef = useRef<string | null>(null);
  const refreshSeqRef = useRef(0);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const consecutiveFailureRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect streaming capability (feature flag) — fetched once on mount.
  useEffect(() => {
    setAccessToken(getAccessToken());
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

  let remaining = session.remaining_seconds;
  if (session.status === "ACTIVE") {
    const base = new Date(session.resume_time ?? session.start_time).getTime();
    remaining = Math.max(
      0,
      session.remaining_seconds - Math.floor((now - base) / 1000),
    );
  }
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const expired = remaining <= 0;
  const isExpanded = variant === "expanded";

  return (
    <div
      className={`flex shrink-0 flex-col ${isExpanded ? "w-[min(95vw,560px)]" : "w-full max-w-[220px]"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
        <span className="truncate text-sm font-semibold text-white">
          {session.device_id?.name || "Device"}
        </span>
        <div className="flex items-center gap-2">
          {!isExpanded && onExpand && (
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
          <div
            className={`flex shrink-0 items-center gap-1 font-mono text-sm font-bold tabular-nums ${
              expired ? "text-red-400" : "text-cyan-400"
            }`}
          >
            {expired
              ? "หมดเวลา"
              : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full">
        <div
          className={`relative mx-auto overflow-hidden rounded-[2.25rem] border-4 border-slate-700 bg-slate-900 shadow-2xl shadow-cyan-900/20 ${
            isExpanded
              ? "h-[88vh] max-h-[88vh] w-auto max-w-[95vw]"
              : "aspect-[9/16] w-full"
          }`}
          style={
            isExpanded ? { aspectRatio: String(screenAspectRatio) } : undefined
          }
        >
          {streamingMode === "scrcpy" && accessToken && deviceSerial ? (
            <H264Player
              ref={h264PlayerRef}
              deviceSerial={deviceSerial}
              token={accessToken}
              className="absolute inset-0"
              onMetadata={(m) => {
                if (m.width > 0 && m.height > 0) {
                  setScreenAspectRatio(m.width / m.height);
                }
              }}
            />
          ) : streamingMode === "screenshot" && imgSrc && !imgError ? (
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
          ) : (
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
          )}

          {!expired && deviceId && (
            <TouchOverlay
              deviceId={deviceId}
              getNaturalSize={getNaturalSize}
              onAction={handleActionRefresh}
            />
          )}

          {expired && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80">
              <span className="text-lg font-bold text-red-400">
                หมดเวลาใช้งาน
              </span>
            </div>
          )}

          {!expired &&
            ((streamingMode === "scrcpy" && accessToken && deviceSerial) ||
              (streamingMode === "screenshot" && imgSrc && !imgError)) && (
              <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                <span className="text-[9px] font-semibold text-green-400">
                  {streamingMode === "scrcpy" ? "LIVE • H.264" : "LIVE"}
                </span>
              </div>
            )}
        </div>

        {!expired && deviceId && (
          <div className="mt-4 flex justify-around px-2">
            {[
              {
                icon: <RotateCcw className="h-5 w-5" />,
                key: KEY.BACK,
                label: "Back",
              },
              {
                icon: <Home className="h-5 w-5" />,
                key: KEY.HOME,
                label: "Home",
              },
              {
                icon: <Square className="h-5 w-5" />,
                key: KEY.RECENTS,
                label: "Recents",
              },
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
