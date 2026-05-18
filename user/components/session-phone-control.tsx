"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Expand,
  Home,
  Monitor,
  PauseCircle,
  RotateCcw,
  Smartphone,
  Square,
} from "lucide-react";
import type { Session } from "@/types/session";
import { H264Player, type H264PlayerHandle } from "@/components/h264-player";
import { DeviceTouchOverlay } from "@boxphon/shared/client/device-touch-overlay";
import { formatDurationThai } from "@boxphon/shared/client/format-duration";
import { getServerNow } from "@boxphon/shared/client/server-time";
import {
  bindDeviceInputSocket,
  sendDeviceInputFast,
} from "@boxphon/shared/client/device-input-transport";
import type { SessionStreamViewState } from "@boxphon/shared/client/session-stream-view";
import { getStreamSocket } from "@/lib/socket-client";
import {
  type ScreenOrientationMode,
  loadOrientationMode,
  saveOrientationMode,
  cycleOrientationMode,
  orientationLabel,
  frameAspectRatioCss,
  getFrameDimensions,
} from "@/lib/screen-orientation";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/$/, "");

const KEY = { BACK: 4, HOME: 3, RECENTS: 187 };

type StreamingMode = "scrcpy" | "screenshot";

const BASE_URL_FOR_MODE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/$/, "");

let cachedStreamingMode: "unknown" | StreamingMode | null = null;
let streamingModeFetch: Promise<StreamingMode> | null = null;

function detectStreamingMode(): Promise<StreamingMode> {
  if (cachedStreamingMode === "scrcpy" || cachedStreamingMode === "screenshot") {
    return Promise.resolve(cachedStreamingMode);
  }
  if (streamingModeFetch) return streamingModeFetch;

  streamingModeFetch = fetch(`${BASE_URL_FOR_MODE}/devices/streaming-mode`, {
    credentials: "include",
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const supportsWebCodecs =
        typeof window !== "undefined" && "VideoDecoder" in window;
      const mode: StreamingMode =
        data?.mode === "scrcpy" && supportsWebCodecs ? "scrcpy" : "screenshot";
      cachedStreamingMode = mode;
      return mode;
    })
    .catch(() => {
      cachedStreamingMode = "screenshot";
      return "screenshot" as StreamingMode;
    })
    .finally(() => {
      streamingModeFetch = null;
    });

  return streamingModeFetch;
}

/** Compact timer for narrow card headers (mobile). */
function formatDurationHeaderCompact(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  if (sec === 0) return "หมด";
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}ชม.${m}น` : `${h}ชม.`;
}

interface SessionPhoneControlProps {
  session: Session;
  variant?: "default" | "expanded";
  onExpand?: () => void;
  onCollapse?: () => void;
  /** Shared stream/orientation state (survives expand ↔ grid). */
  streamView?: SessionStreamViewState;
  onStreamViewChange?: (patch: Partial<SessionStreamViewState>) => void;
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
  onCollapse,
  streamView,
  onStreamViewChange,
  fetchedAt,
}: SessionPhoneControlProps) {
  const [now, setNow] = useState(() => getServerNow());
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [localStreamSize, setLocalStreamSize] = useState({
    width: 1080,
    height: 2340,
  });
  const [localOrientation, setLocalOrientation] =
    useState<ScreenOrientationMode>(() => loadOrientationMode(session._id));

  const streamSize = streamView?.streamSize ?? localStreamSize;
  const orientationMode = streamView?.orientationMode ?? localOrientation;
  const [streamingMode, setStreamingMode] = useState<"unknown" | StreamingMode>(
    "unknown",
  );

  const frameAspectCss = useMemo(
    () =>
      frameAspectRatioCss(
        streamSize.width,
        streamSize.height,
        orientationMode,
      ),
    [streamSize.width, streamSize.height, orientationMode],
  );

  const landscapeFrame = useMemo(() => {
    const { width, height } = getFrameDimensions(
      streamSize.width,
      streamSize.height,
      orientationMode,
    );
    return width >= height;
  }, [streamSize.width, streamSize.height, orientationMode]);

  const applyStreamDimensions = useCallback(
    (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      const next = { width, height };
      if (onStreamViewChange) {
        onStreamViewChange({ streamSize: next });
      } else {
        setLocalStreamSize(next);
      }
    },
    [onStreamViewChange],
  );

  const cycleOrientation = () => {
    const next = cycleOrientationMode(orientationMode);
    saveOrientationMode(session._id, next);
    if (onStreamViewChange) {
      onStreamViewChange({ orientationMode: next });
    } else {
      setLocalOrientation(next);
    }
  };

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

  // Detect streaming mode once per page load (shared across all cards).
  useEffect(() => {
    let cancelled = false;
    void detectStreamingMode().then((mode) => {
      if (!cancelled) setStreamingMode(mode);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const deviceId = session.device_id?._id;
  const deviceSerial = session.device_id?.serial_number;

  useEffect(() => {
    if (streamingMode !== "scrcpy" || !deviceSerial) return;
    const socket = getStreamSocket();
    bindDeviceInputSocket(socket);
    return () => bindDeviceInputSocket(null);
  }, [streamingMode, deviceSerial]);

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

  const getVideoSize = useCallback(() => {
    if (streamingMode === "scrcpy" && h264PlayerRef.current) {
      const vs = h264PlayerRef.current.getVideoSize();
      if (vs.width > 0 && vs.height > 0) return vs;
    }
    return streamSize;
  }, [streamingMode, streamSize]);

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

  const shellMaxClass = isExpanded
    ? landscapeFrame
      ? "max-w-[min(96vw,920px)]"
      : "max-w-[min(92vw,420px)] sm:max-w-[min(90vw,480px)] md:max-w-[520px]"
    : landscapeFrame
      ? "max-w-[min(calc(100vw-1.5rem),420px)] sm:max-w-[min(100%,480px)] md:max-w-[540px] lg:max-w-[600px]"
      : "max-w-[min(calc(100vw-1.5rem),240px)] sm:max-w-[260px] md:max-w-[280px]";

  const orientationIcon =
    orientationMode === "auto" ? (
      <RotateCcw className="h-3.5 w-3.5" />
    ) : orientationMode === "portrait" ? (
      <Smartphone className="h-3.5 w-3.5" />
    ) : (
      <Monitor className="h-3.5 w-3.5" />
    );

  const frameSizeStyle: React.CSSProperties = {
    width: "100%",
    aspectRatio: frameAspectCss,
    ...(isExpanded && landscapeFrame
      ? { maxHeight: "min(78vh, 520px)" }
      : isExpanded
        ? { maxHeight: "min(82vh, 720px)" }
        : {}),
  };

  const deviceName = session.device_id?.name || "Device";

  return (
    <motion.div
      className={`flex w-full min-w-0 shrink-0 flex-col ${shellMaxClass}`}
    >
      <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-2 shadow-lg shadow-black/20 sm:rounded-3xl sm:p-3 md:p-3.5">
        <motion.div
          layout
          className="mb-2 flex min-w-0 items-center gap-1 border-b border-slate-800/90 pb-2 sm:mb-3 sm:gap-1.5 sm:pb-2.5"
        >
          <span
            className="min-w-0 flex-1 truncate text-xs font-semibold text-white sm:text-sm"
            title={deviceName}
          >
            {deviceName}
          </span>
          <motion.div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {streamActive && (
            <button
              type="button"
              onClick={cycleOrientation}
              className="inline-flex h-7 max-w-[5.5rem] items-center gap-0.5 overflow-hidden rounded-md border border-slate-700 bg-slate-800/70 px-1.5 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white sm:max-w-none sm:gap-1 sm:px-2"
              aria-label={`สลับแนวจอ: ${orientationLabel(orientationMode)}`}
              title={`แนวจอ: ${orientationLabel(orientationMode)} (แตะเพื่อสลับ)`}
            >
              {orientationIcon}
              <span className="truncate text-[9px] sm:text-[10px]">
                {orientationLabel(orientationMode)}
              </span>
            </button>
          )}
          {!isExpanded && onExpand && streamActive && (
            <button
              type="button"
              onClick={onExpand}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-800/70 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              aria-label="ขยายจอ"
              title="ขยายจอ"
            >
              <Expand className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
          {isPaused && (
            <PauseCircle className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <div
            className={`flex shrink-0 items-center font-bold tabular-nums leading-none ${
              expired
                ? "text-red-400"
                : isPaused
                  ? "text-amber-400"
                  : "text-cyan-400"
            }`}
          >
            <span className="text-[10px] sm:hidden">
              {formatDurationHeaderCompact(remaining)}
            </span>
            <span className="hidden whitespace-nowrap text-xs sm:inline md:text-sm">
              {formatDurationThai(remaining)}
            </span>
          </div>
          </motion.div>
        </motion.div>

        <motion.div
          layout
          className="relative mx-auto w-full min-w-0 overflow-hidden rounded-[1.75rem] border-[3px] border-slate-700 bg-slate-900 shadow-xl shadow-cyan-900/20 sm:rounded-[2rem] sm:border-4 md:rounded-[2.25rem]"
          style={{
            ...frameSizeStyle,
            isolation: "isolate",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          transition={{ layout: { duration: 0.22, ease: "easeOut" } }}
        >
          {/* ── stream layer ── */}
          {streamingMode === "scrcpy" && deviceSerial && streamActive ? (
            <H264Player
              ref={h264PlayerRef}
              deviceSerial={deviceSerial}
              className="absolute inset-0"
              onMetadata={(m) => {
                applyStreamDimensions(m.width, m.height);
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
                applyStreamDimensions(naturalWidth, naturalHeight);
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
            <DeviceTouchOverlay
              deviceId={deviceId}
              deviceSerial={deviceSerial}
              apiBaseUrl={BASE_URL}
              getNaturalSize={getNaturalSize}
              getVideoElement={getVideoElement}
              getVideoSize={getVideoSize}
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
        </motion.div>

        {/* ── Android nav buttons (Back / Home / Recents) ── */}
        {streamActive && deviceId && (
          <div className="mt-3 flex min-w-0 justify-around gap-1 px-0.5 sm:mt-4 sm:gap-2 sm:px-1">
            {[
              { icon: <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />, key: KEY.BACK,    label: "Back"    },
              { icon: <Home       className="h-4 w-4 sm:h-5 sm:w-5" />, key: KEY.HOME,    label: "Home"    },
              { icon: <Square     className="h-4 w-4 sm:h-5 sm:w-5" />, key: KEY.RECENTS, label: "Recents" },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                aria-label={btn.label}
                onClick={() => {
                  void sendDeviceInputFast(
                    BASE_URL,
                    { deviceId, deviceSerial },
                    "key",
                    { keycode: btn.key },
                    { awaitResponse: true },
                  )?.then(() => handleActionRefresh());
                }}
                className="flex min-w-0 flex-1 max-w-[5.5rem] flex-col items-center gap-0.5 rounded-lg bg-slate-800 px-2 py-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white active:bg-slate-600 sm:max-w-none sm:rounded-xl sm:px-4 sm:py-2 md:px-5"
              >
                {btn.icon}
                <span className="text-[8px] text-slate-500 sm:text-[9px]">{btn.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
