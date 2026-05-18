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
import { DeviceTouchOverlay } from "@boxphon/shared/client/device-touch-overlay";
import { RefreshCw } from "lucide-react";

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

  const getVideoSize = useCallback(() => {
    if (streamingMode === "scrcpy" && playerRef.current) {
      const vs = playerRef.current.getVideoSize();
      if (vs.width > 0 && vs.height > 0) return vs;
    }
    const img = imgRef.current;
    if (img && img.naturalWidth > 0) {
      return { width: img.naturalWidth, height: img.naturalHeight };
    }
    return getNaturalSize();
  }, [streamingMode, getNaturalSize]);

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
        <DeviceTouchOverlay
          deviceId={deviceId}
          deviceSerial={deviceSerial}
          apiBaseUrl={BASE_URL}
          getNaturalSize={getNaturalSize}
          getVideoElement={getVideoElement}
          getVideoSize={getVideoSize}
        />
      )}
    </div>
  );
}
