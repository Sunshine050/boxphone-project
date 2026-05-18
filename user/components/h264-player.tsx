"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { getStreamSocket } from "@/lib/socket-client";

export interface H264PlayerMeta {
  width: number;
  height: number;
  deviceName: string;
}

export interface H264PlayerHandle {
  /** ADB input coordinate space (device native, orientation-corrected) */
  getNaturalSize: () => { width: number; height: number };
  /** Encoded video frame size from scrcpy (may be scaled by max-size) */
  getVideoSize: () => { width: number; height: number };
  /** Canvas element — use getBoundingClientRect() for precise touch mapping */
  getCanvas: () => HTMLCanvasElement | null;
}

interface H264PlayerProps {
  deviceSerial: string;
  /** Optional — socket authenticates via HttpOnly cookie when omitted */
  token?: string;
  className?: string;
  onMetadata?: (meta: H264PlayerMeta) => void;
  onError?: (err: Error) => void;
  onConnected?: () => void;
}

type FramePayload = {
  deviceSerial: string;
  data: ArrayBuffer | Uint8Array;
  isConfig: boolean;
  isKeyFrame: boolean;
  pts: string;
};

const FALLBACK_CODEC = "avc1.42E01E";

/** แยก Annex-B NAL units (ใช้หา SPS เพื่อสร้าง codec string ที่ถูกต้อง) */
function splitNalUnits(buf: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  let i = 0;
  while (i < buf.length) {
    let start = -1;
    let startLen = 0;
    if (
      i + 3 < buf.length &&
      buf[i] === 0 &&
      buf[i + 1] === 0 &&
      buf[i + 2] === 0 &&
      buf[i + 3] === 1
    ) {
      start = i + 4;
      startLen = 4;
    } else if (
      i + 2 < buf.length &&
      buf[i] === 0 &&
      buf[i + 1] === 0 &&
      buf[i + 2] === 1
    ) {
      start = i + 3;
      startLen = 3;
    }
    if (start === -1) {
      i++;
      continue;
    }
    // Find next start code
    let j = start;
    while (j + 2 < buf.length) {
      if (
        buf[j] === 0 &&
        buf[j + 1] === 0 &&
        (buf[j + 2] === 1 ||
          (j + 3 < buf.length && buf[j + 2] === 0 && buf[j + 3] === 1))
      ) {
        break;
      }
      j++;
    }
    if (j + 2 >= buf.length) j = buf.length;
    out.push(buf.subarray(start, j));
    i = j;
  }
  return out;
}

function codecFromConfig(config: Uint8Array): string {
  const nals = splitNalUnits(config);
  for (const nal of nals) {
    if (nal.length >= 4 && (nal[0] & 0x1f) === 7) {
      const profile = nal[1].toString(16).padStart(2, "0");
      const constraint = nal[2].toString(16).padStart(2, "0");
      const level = nal[3].toString(16).padStart(2, "0");
      return `avc1.${profile}${constraint}${level}`;
    }
  }
  return FALLBACK_CODEC;
}

/**
 * Build AVCDecoderConfigurationRecord (ISO 14496-15) from a scrcpy config
 * packet (SPS + PPS in Annex-B format).  The record is required by Chrome's
 * WebCodecs VideoDecoder as the `description` field when the stream is in
 * AVC/AVCC format.
 */
function buildAVCConfig(config: Uint8Array): Uint8Array | null {
  const nals = splitNalUnits(config);
  let sps: Uint8Array | null = null;
  let pps: Uint8Array | null = null;
  for (const nal of nals) {
    const t = nal[0] & 0x1f;
    if (t === 7 && !sps) sps = nal;
    if (t === 8 && !pps) pps = nal;
  }
  if (!sps || !pps) return null;

  const buf = new Uint8Array(11 + sps.length + pps.length);
  let i = 0;
  buf[i++] = 0x01;                         // configurationVersion
  buf[i++] = sps[1];                        // AVCProfileIndication
  buf[i++] = sps[2];                        // profile_compatibility
  buf[i++] = sps[3];                        // AVCLevelIndication
  buf[i++] = 0xff;                          // reserved(6) | lengthSizeMinusOne(2)=3 → 4-byte lengths
  buf[i++] = 0xe1;                          // reserved(3) | numSPS(5)=1
  buf[i++] = (sps.length >> 8) & 0xff;
  buf[i++] = sps.length & 0xff;
  buf.set(sps, i); i += sps.length;
  buf[i++] = 0x01;                          // numPPS=1
  buf[i++] = (pps.length >> 8) & 0xff;
  buf[i++] = pps.length & 0xff;
  buf.set(pps, i);
  return buf;
}

/**
 * Convert Annex-B NAL units (start-code prefixed) to AVCC format
 * (4-byte big-endian length prefix per NAL unit) required by WebCodecs
 * when a `description` is present in the VideoDecoderConfig.
 */
function annexBtoAvcc(annexB: Uint8Array): Uint8Array {
  const nals = splitNalUnits(annexB);
  if (nals.length === 0) return annexB;
  const total = nals.reduce((s, n) => s + 4 + n.length, 0);
  const avcc = new Uint8Array(total);
  const view = new DataView(avcc.buffer);
  let off = 0;
  for (const nal of nals) {
    view.setUint32(off, nal.length, false); // big-endian
    off += 4;
    avcc.set(nal, off);
    off += nal.length;
  }
  return avcc;
}

function toUint8(data: ArrayBuffer | Uint8Array | unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  // socket.io may also wrap in { type:'Buffer', data:[...] } when not binary
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { data?: unknown[] }).data)
  ) {
    return new Uint8Array((data as { data: number[] }).data);
  }
  throw new Error("Unsupported frame payload type");
}

export const H264Player = forwardRef<H264PlayerHandle, H264PlayerProps>(
  function H264Player(
    { deviceSerial, token, className, onMetadata, onError, onConnected },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const decoderRef = useRef<VideoDecoder | null>(null);
    const configPacketRef = useRef<Uint8Array | null>(null);
    const naturalSizeRef = useRef({ width: 0, height: 0 });
    const videoSizeRef = useRef({ width: 0, height: 0 });
    const decoderConfiguredRef = useRef(false);
    const configuredCodecRef = useRef<string | null>(null);
    // After configure() or a reconfigure triggered by a new config packet,
    // WebCodecs requires the very first chunk to be a keyframe.  Drop all
    // delta frames until one arrives.
    const waitingKeyFrameRef = useRef(true);
    const subscribedRef = useRef(false);
    const ptsRef = useRef(0);
    const [status, setStatus] = useState<
      "connecting" | "waiting" | "playing" | "error"
    >("connecting");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      getNaturalSize: () => naturalSizeRef.current,
      getVideoSize: () => videoSizeRef.current,
      getCanvas: () => canvasRef.current,
    }));

    useEffect(() => {
      if (typeof window === "undefined") return;
      if (!("VideoDecoder" in window)) {
        const err = new Error(
          "เบราว์เซอร์นี้ไม่รองรับ WebCodecs (ต้องใช้ Chrome/Edge 94+)",
        );
        setStatus("error");
        setErrorMessage(err.message);
        onError?.(err);
        return;
      }
      if (!deviceSerial) return;

      const socket = getStreamSocket(token);
      let cancelled = false;
      let watchdog: ReturnType<typeof setTimeout> | null = null;
      let subscribeRetryCount = 0;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      // Cold start (adb push + scrcpy boot + first keyframe) can exceed 15 s on
      // refresh; reset the timer whenever we receive metadata or any frame.
      const STREAM_TIMEOUT_MS = 35000;
      const MAX_SUBSCRIBE_RETRIES = 1;

      const clearWatchdog = () => {
        if (watchdog) {
          clearTimeout(watchdog);
          watchdog = null;
        }
      };

      const isPlayingRef = { current: false };
      let decodeErrorStreak = 0;
      let preferSoftwareDecoder = false;

      const closeDecoder = () => {
        if (decoderRef.current && decoderRef.current.state !== "closed") {
          try {
            decoderRef.current.close();
          } catch {
            /* ignore */
          }
        }
        decoderRef.current = null;
        decoderConfiguredRef.current = false;
        waitingKeyFrameRef.current = true; // need keyframe after every (re)configure
      };

      const handleDecodedFrame = (frame: VideoFrame) => {
        if (cancelled) {
          frame.close();
          return;
        }
        const c = canvasRef.current;
        const cx = c?.getContext("2d");
        if (c && cx) {
          if (
            c.width !== frame.displayWidth ||
            c.height !== frame.displayHeight
          ) {
            c.width = frame.displayWidth;
            c.height = frame.displayHeight;
            videoSizeRef.current = {
              width: frame.displayWidth,
              height: frame.displayHeight,
            };
            // First frame: if we never received stream_metadata with native
            // display size, fall back to video dimensions for touch mapping
            // (better than nothing, though slightly inaccurate for scaled streams).
            if (
              naturalSizeRef.current.width === 0 ||
              naturalSizeRef.current.height === 0
            ) {
              naturalSizeRef.current = {
                width: frame.displayWidth,
                height: frame.displayHeight,
              };
              onMetadata?.({
                width: frame.displayWidth,
                height: frame.displayHeight,
                deviceName: "",
              });
            }
            // If naturalSizeRef is already set (from stream_metadata with display
            // size), don't overwrite it with video dimensions — the display size
            // is what ADB input tap expects.
          }
          cx.drawImage(frame, 0, 0);
          isPlayingRef.current = true;
          decodeErrorStreak = 0;
          setStatus("playing");
          setErrorMessage(null);
          clearWatchdog();
        }
        frame.close();
      };

      const armWatchdog = () => {
        clearWatchdog();
        watchdog = setTimeout(() => {
          if (cancelled) return;
          if (retrySubscribe()) {
            armWatchdog();
            return;
          }
          console.warn(
            "[H264Player] no frame received within",
            STREAM_TIMEOUT_MS,
            "ms",
          );
          setStatus("error");
          setErrorMessage(
            "ไม่ได้รับวิดีโอจากเครื่อง — ลองรีเฟรชหรือเชื่อมต่อใหม่",
          );
          onError?.(new Error("stream timeout"));
        }, STREAM_TIMEOUT_MS);
      };

      const retrySubscribe = () => {
        if (cancelled || subscribeRetryCount >= MAX_SUBSCRIBE_RETRIES) {
          return false;
        }
        subscribeRetryCount += 1;
        console.warn("[H264Player] stream slow — retrying subscribe");
        subscribedRef.current = false;
        isPlayingRef.current = false;
        try {
          socket.emit("stream_unsubscribe", { deviceSerial });
        } catch {
          /* ignore */
        }
        closeDecoder();
        configPacketRef.current = null;
        waitingKeyFrameRef.current = true;
        setStatus("waiting");
        setErrorMessage(null);
        window.setTimeout(() => {
          if (!cancelled) subscribe();
        }, 400);
        return true;
      };

      const bumpWatchdog = () => {
        if (isPlayingRef.current) return;
        armWatchdog();
      };

      const ensureDecoderConfigured = (config: Uint8Array) => {
        if (
          decoderConfiguredRef.current &&
          decoderRef.current?.state === "configured"
        ) {
          return;
        }

        closeDecoder();
        const codec = codecFromConfig(config);
        const description = buildAVCConfig(config);
        configuredCodecRef.current = codec;

        const hw = preferSoftwareDecoder
          ? ("prefer-software" as const)
          : ("prefer-hardware" as const);

        try {
          decoderRef.current = new VideoDecoder({
            output: handleDecodedFrame,
            error: (e) => {
              // WebCodecs closes the decoder after error — recreate silently.
              console.warn("[H264Player] decoder error — recovering", e);
              decodeErrorStreak += 1;
              setErrorMessage(null);
              if (decodeErrorStreak >= 12) {
                setStatus("error");
                setErrorMessage("วิดีโอขัดข้อง — ลองรีเฟรชหน้า");
                onError?.(e instanceof Error ? e : new Error(String(e)));
                return;
              }
              if (!preferSoftwareDecoder) {
                preferSoftwareDecoder = true;
              }
              const cfg = configPacketRef.current;
              if (cfg) ensureDecoderConfigured(cfg);
            },
          });
          decoderRef.current.configure({
            codec,
            ...(description ? { description } : {}),
            optimizeForLatency: true,
            hardwareAcceleration: hw,
          });
          decoderConfiguredRef.current = true;
          waitingKeyFrameRef.current = true;
          console.log(
            "[H264Player] decoder configured",
            codec,
            hw,
            description ? "(with description)" : "(no description)",
          );
        } catch (e: any) {
          if (!preferSoftwareDecoder) {
            preferSoftwareDecoder = true;
            ensureDecoderConfigured(config);
            return;
          }
          const err = new Error(
            `VideoDecoder configure failed: ${e?.message || e}`,
          );
          onError?.(err);
          setStatus("error");
          setErrorMessage(err.message);
        }
      };

      const onMetadataEvent = (payload: {
        deviceSerial: string;
        width: number;
        height: number;
        deviceName: string;
        codec?: string;
        /** Device's logical display size (portrait-base) — ADB input coordinate space */
        displayWidth?: number;
        displayHeight?: number;
      }) => {
        if (payload.deviceSerial !== deviceSerial) return;

        videoSizeRef.current = {
          width: payload.width,
          height: payload.height,
        };

        // Canvas renders video at video resolution
        if (canvasRef.current) {
          canvasRef.current.width = payload.width;
          canvasRef.current.height = payload.height;
        }

        // Touch overlay needs NATIVE display coordinates (ADB input space).
        // `displayWidth/Height` from backend is the portrait-base size from
        // `adb shell wm size`.  Rotate it to match the current video orientation
        // (video dims already reflect the device's physical orientation).
        if (payload.displayWidth && payload.displayHeight) {
          const isLandscape = payload.width > payload.height;
          // wm size always portrait-base → smaller side = portrait width, larger = height
          const portraitW = Math.min(payload.displayWidth, payload.displayHeight);
          const portraitH = Math.max(payload.displayWidth, payload.displayHeight);
          naturalSizeRef.current = isLandscape
            ? { width: portraitH, height: portraitW }   // landscape: swap dims
            : { width: portraitW, height: portraitH };  // portrait: keep as-is
        } else {
          // Fallback: use video resolution (less accurate for scaled streams)
          naturalSizeRef.current = {
            width: payload.width,
            height: payload.height,
          };
        }

        onMetadata?.({
          width: payload.width,
          height: payload.height,
          deviceName: payload.deviceName,
        });
        if (!isPlayingRef.current) {
          setStatus("waiting");
          bumpWatchdog();
        }
      };

      const onFrame = (payload: FramePayload) => {
        if (payload.deviceSerial !== deviceSerial) return;
        bumpWatchdog();
        let bytes: Uint8Array;
        try {
          bytes = toUint8(payload.data);
        } catch (e: any) {
          console.warn("[H264Player] bad frame payload", e);
          return;
        }
        if (payload.isConfig) {
          // Config packet = SPS + PPS from scrcpy.
          configPacketRef.current = bytes;
          const nextCodec = codecFromConfig(bytes);
          if (
            decoderConfiguredRef.current &&
            configuredCodecRef.current &&
            configuredCodecRef.current !== nextCodec
          ) {
            closeDecoder();
          }
          configuredCodecRef.current = nextCodec;
          if (!decoderConfiguredRef.current) {
            ensureDecoderConfigured(bytes);
          }
          waitingKeyFrameRef.current = true;
          return;
        }

        // Regular video frame — must have decoder configured
        if (!decoderConfiguredRef.current && configPacketRef.current) {
          ensureDecoderConfigured(configPacketRef.current);
        }
        if (
          !decoderRef.current ||
          decoderRef.current.state !== "configured"
        ) {
          if (configPacketRef.current) {
            ensureDecoderConfigured(configPacketRef.current);
          }
          if (
            !decoderRef.current ||
            decoderRef.current.state !== "configured"
          ) {
            return;
          }
        }

        // After configure() / reconfigure, WebCodecs MUST receive a keyframe
        // first — delta frames before that cause DataError.  Drop until IDR.
        if (waitingKeyFrameRef.current) {
          if (!payload.isKeyFrame) return;
          waitingKeyFrameRef.current = false;
        }

        // Convert Annex-B (start-code prefixed) → AVCC (length-prefixed) so
        // Chrome WebCodecs can decode it together with the AVCDecoderConfigRecord.
        const avccData = annexBtoAvcc(bytes);
        try {
          decoderRef.current.decode(
            new EncodedVideoChunk({
              type: payload.isKeyFrame ? "key" : "delta",
              timestamp: ptsRef.current++,
              data: avccData,
            }),
          );
        } catch (e: any) {
          console.warn("[H264Player] decode frame failed", e);
          waitingKeyFrameRef.current = true;
          if (configPacketRef.current) {
            ensureDecoderConfigured(configPacketRef.current);
          }
        }
      };

      const onStreamError = (payload: {
        deviceSerial: string;
        message: string;
      }) => {
        if (payload.deviceSerial !== deviceSerial) return;
        console.warn("[H264Player] stream_error", payload.message);
        setStatus("error");
        setErrorMessage(payload.message);
        onError?.(new Error(payload.message));
      };

      function subscribe() {
        if (subscribedRef.current) return;
        subscribedRef.current = true;
        isPlayingRef.current = false;
        socket.emit("stream_subscribe", { deviceSerial });
        setStatus("waiting");
        armWatchdog();
        onConnected?.();
      }

      const onConnect = () => {
        console.log("[H264Player] stream socket connected");
        // Re-subscribe after reconnect
        subscribedRef.current = false;
        subscribe();
      };

      const onDisconnect = () => {
        console.warn("[H264Player] stream socket disconnected");
        subscribedRef.current = false;
        isPlayingRef.current = false;
        decoderConfiguredRef.current = false;
        clearWatchdog();
        setStatus("connecting");
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("stream_metadata", onMetadataEvent);
      socket.on("stream_frame", onFrame);
      socket.on("stream_error", onStreamError);

      if (socket.connected) {
        subscribe();
      } else {
        setStatus("connecting");
      }

      return () => {
        cancelled = true;
        clearWatchdog();
        try {
          socket.emit("stream_unsubscribe", { deviceSerial });
        } catch {
          /* ignore */
        }
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("stream_metadata", onMetadataEvent);
        socket.off("stream_frame", onFrame);
        socket.off("stream_error", onStreamError);
        subscribedRef.current = false;
        closeDecoder();
        configPacketRef.current = null;
        // Keep last decoded frame on canvas until unmount (avoids blank flash).
      };
      // status is intentionally excluded — we read it via ref-style closure
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceSerial, token]);

    return (
      <div className={className} style={{ position: "absolute", inset: 0 }}>
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{ imageRendering: "auto" }}
        />
        {status !== "playing" && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 ${
              status === "error" ? "bg-slate-900" : "bg-slate-900/70"
            }`}
          >
            <div
              className={`h-10 w-10 rounded-full border-4 border-cyan-500 ${
                status === "error"
                  ? "opacity-30"
                  : "border-t-transparent animate-spin"
              }`}
            />
            <span className="text-xs text-slate-400">
              {status === "connecting" && "กำลังเชื่อมต่อ..."}
              {status === "waiting" && "กำลังโหลดสตรีม..."}
              {status === "error" && (errorMessage ?? "ไม่สามารถโหลดสตรีมได้")}
            </span>
          </div>
        )}
      </div>
    );
  },
);
