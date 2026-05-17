"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { getStreamSocket } from "@/lib/socket-client";

export interface H264PlayerMeta {
  width: number;
  height: number;
  deviceName: string;
}

export interface H264PlayerHandle {
  /** จอ Android จริงเป็นกี่ pixel — ใช้แทน img.naturalWidth/Height สำหรับ touch overlay */
  getNaturalSize: () => { width: number; height: number };
  /** Canvas element หากต้อง measure ขนาดบนจอ */
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
    const decoderConfiguredRef = useRef(false);
    const subscribedRef = useRef(false);
    const ptsRef = useRef(0);
    const [status, setStatus] = useState<
      "connecting" | "waiting" | "playing" | "error"
    >("connecting");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      getNaturalSize: () => naturalSizeRef.current,
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
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

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
          }
          cx.drawImage(frame, 0, 0);
          if (status !== "playing") setStatus("playing");
        }
        frame.close();
      };

      const ensureDecoderConfigured = (config: Uint8Array) => {
        if (decoderConfiguredRef.current) return;
        const codec = codecFromConfig(config);
        try {
          decoderRef.current = new VideoDecoder({
            output: handleDecodedFrame,
            error: (e) => {
              console.error("[H264Player] decoder error", e);
              onError?.(e instanceof Error ? e : new Error(String(e)));
              setStatus("error");
              setErrorMessage(String(e));
              closeDecoder();
            },
          });
          decoderRef.current.configure({
            codec,
            optimizeForLatency: true,
            hardwareAcceleration: "prefer-hardware",
          });
          decoderConfiguredRef.current = true;
          console.log("[H264Player] decoder configured", codec);
        } catch (e: any) {
          const err = new Error(`VideoDecoder configure failed: ${e?.message || e}`);
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
      }) => {
        if (payload.deviceSerial !== deviceSerial) return;
        naturalSizeRef.current = {
          width: payload.width,
          height: payload.height,
        };
        if (canvasRef.current) {
          canvasRef.current.width = payload.width;
          canvasRef.current.height = payload.height;
        }
        onMetadata?.({
          width: payload.width,
          height: payload.height,
          deviceName: payload.deviceName,
        });
        setStatus("waiting");
      };

      const onFrame = (payload: FramePayload) => {
        if (payload.deviceSerial !== deviceSerial) return;
        let bytes: Uint8Array;
        try {
          bytes = toUint8(payload.data);
        } catch (e: any) {
          console.warn("[H264Player] bad frame payload", e);
          return;
        }
        if (payload.isConfig) {
          configPacketRef.current = bytes;
          ensureDecoderConfigured(bytes);
          // Also feed config NAL into decoder so it has SPS/PPS in its bitstream
          if (decoderRef.current?.state === "configured") {
            try {
              decoderRef.current.decode(
                new EncodedVideoChunk({
                  type: "key",
                  timestamp: ptsRef.current++,
                  data: bytes,
                }),
              );
            } catch (e: any) {
              console.warn("[H264Player] decode config failed", e);
            }
          }
          return;
        }
        // Regular frame — must have decoder configured
        if (!decoderConfiguredRef.current && configPacketRef.current) {
          ensureDecoderConfigured(configPacketRef.current);
        }
        if (
          !decoderRef.current ||
          decoderRef.current.state !== "configured"
        ) {
          return; // not ready yet — drop frame until decoder warm
        }
        try {
          decoderRef.current.decode(
            new EncodedVideoChunk({
              type: payload.isKeyFrame ? "key" : "delta",
              timestamp: ptsRef.current++,
              data: bytes,
            }),
          );
        } catch (e: any) {
          console.warn("[H264Player] decode frame failed", e);
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

      const subscribe = () => {
        if (subscribedRef.current) return;
        subscribedRef.current = true;
        socket.emit("stream_subscribe", { deviceSerial });
        setStatus("waiting");
        onConnected?.();
      };

      const onConnect = () => {
        console.log("[H264Player] stream socket connected");
        // Re-subscribe after reconnect
        subscribedRef.current = false;
        subscribe();
      };

      const onDisconnect = () => {
        console.warn("[H264Player] stream socket disconnected");
        subscribedRef.current = false;
        decoderConfiguredRef.current = false;
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
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
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
