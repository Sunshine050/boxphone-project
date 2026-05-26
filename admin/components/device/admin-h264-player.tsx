"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { getStreamSocket } from "@/lib/socket-client";

/* ─── public types ─── */
export interface AdminH264PlayerMeta {
  width: number;
  height: number;
  deviceName: string;
  displayWidth?: number;
  displayHeight?: number;
}

export interface AdminH264PlayerHandle {
  getNaturalSize: () => { width: number; height: number };
  getVideoSize: () => { width: number; height: number };
  getCanvas: () => HTMLCanvasElement | null;
}

interface Props {
  deviceSerial: string;
  className?: string;
  onMetadata?: (meta: AdminH264PlayerMeta) => void;
  onError?: (err: Error) => void;
}

type FramePayload = {
  deviceSerial: string;
  data: ArrayBuffer | Uint8Array | { type: "Buffer"; data: number[] };
  isConfig: boolean;
  isKeyFrame: boolean;
  pts: string;
};

const FALLBACK_CODEC = "avc1.42E01E";

function splitNalUnits(buf: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  let i = 0;
  while (i < buf.length) {
    let start = -1;
    if (i + 3 < buf.length && buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 0 && buf[i + 3] === 1) {
      start = i + 4; i += 4;
    } else if (i + 2 < buf.length && buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 1) {
      start = i + 3; i += 3;
    } else { i++; continue; }
    let j = start;
    while (j + 2 < buf.length) {
      if (buf[j] === 0 && buf[j + 1] === 0 && (buf[j + 2] === 1 || (j + 3 < buf.length && buf[j + 2] === 0 && buf[j + 3] === 1))) break;
      j++;
    }
    if (j + 2 >= buf.length) j = buf.length;
    out.push(buf.subarray(start, j));
    i = j;
  }
  return out;
}

function codecFromConfig(config: Uint8Array): string {
  for (const nal of splitNalUnits(config)) {
    if (nal.length >= 4 && (nal[0] & 0x1f) === 7) {
      return `avc1.${nal[1].toString(16).padStart(2, "0")}${nal[2].toString(16).padStart(2, "0")}${nal[3].toString(16).padStart(2, "0")}`;
    }
  }
  return FALLBACK_CODEC;
}

function buildAVCConfig(config: Uint8Array): Uint8Array | null {
  const nals = splitNalUnits(config);
  let sps: Uint8Array | null = null, pps: Uint8Array | null = null;
  for (const nal of nals) {
    const t = nal[0] & 0x1f;
    if (t === 7 && !sps) sps = nal;
    if (t === 8 && !pps) pps = nal;
  }
  if (!sps || !pps) return null;
  const buf = new Uint8Array(11 + sps.length + pps.length);
  let i = 0;
  buf[i++] = 0x01; buf[i++] = sps[1]; buf[i++] = sps[2]; buf[i++] = sps[3];
  buf[i++] = 0xff; buf[i++] = 0xe1;
  buf[i++] = (sps.length >> 8) & 0xff; buf[i++] = sps.length & 0xff;
  buf.set(sps, i); i += sps.length;
  buf[i++] = 0x01;
  buf[i++] = (pps.length >> 8) & 0xff; buf[i++] = pps.length & 0xff;
  buf.set(pps, i);
  return buf;
}

function annexBtoAvcc(annexB: Uint8Array): Uint8Array {
  const nals = splitNalUnits(annexB);
  if (nals.length === 0) return annexB;
  const total = nals.reduce((s, n) => s + 4 + n.length, 0);
  const avcc = new Uint8Array(total);
  const view = new DataView(avcc.buffer);
  let off = 0;
  for (const nal of nals) {
    view.setUint32(off, nal.length, false);
    off += 4;
    avcc.set(nal, off);
    off += nal.length;
  }
  return avcc;
}

function isAuthStreamError(message: string): boolean {
  return message.toLowerCase().includes("authenticated users");
}

function toUint8(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown[] }).data)) {
    return new Uint8Array((data as { data: number[] }).data);
  }
  throw new Error("Unsupported frame payload");
}

export const AdminH264Player = forwardRef<AdminH264PlayerHandle, Props>(
  function AdminH264Player({ deviceSerial, className, onMetadata, onError }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const decoderRef = useRef<VideoDecoder | null>(null);
    const configPacketRef = useRef<Uint8Array | null>(null);
    const naturalSizeRef = useRef({ width: 0, height: 0 });
    const videoSizeRef = useRef({ width: 0, height: 0 });
    const decoderConfiguredRef = useRef(false);
    const waitingKeyRef = useRef(true);
    const subscribedRef = useRef(false);
    const ptsRef = useRef(0);
    const isPlayingRef = useRef(false);

    const [status, setStatus] = useState<"connecting" | "waiting" | "playing" | "error">("connecting");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      getNaturalSize: () => naturalSizeRef.current,
      getVideoSize: () => videoSizeRef.current,
      getCanvas: () => canvasRef.current,
    }));

    useEffect(() => {
      if (typeof window === "undefined" || !("VideoDecoder" in window)) {
        const err = new Error("Browser does not support WebCodecs");
        setStatus("error"); setErrorMsg(err.message); onError?.(err); return;
      }
      if (!deviceSerial) return;

      const socket = getStreamSocket();
      let cancelled = false;
      let watchdog: ReturnType<typeof setTimeout> | null = null;
      let authTimeout: ReturnType<typeof setTimeout> | null = null;
      let authRetryTimer: ReturnType<typeof setTimeout> | null = null;
      let retries = 0;
      let authRetryCount = 0;

      const TIMEOUT_MS = 35000;
      const AUTH_TIMEOUT_MS = 3000;
      const AUTH_RETRY_DELAY_MS = 2000;
      const MAX_AUTH_RETRIES = 3;

      const clearWd = () => { if (watchdog) { clearTimeout(watchdog); watchdog = null; } };
      const clearAuthTimeout = () => {
        if (authTimeout) { clearTimeout(authTimeout); authTimeout = null; }
      };
      const clearAuthRetryTimer = () => {
        if (authRetryTimer) { clearTimeout(authRetryTimer); authRetryTimer = null; }
      };

      const closeDecoder = () => {
        if (decoderRef.current && decoderRef.current.state !== "closed") {
          try { decoderRef.current.close(); } catch { /* ignore */ }
        }
        decoderRef.current = null;
        decoderConfiguredRef.current = false;
        waitingKeyRef.current = true;
      };

      const handleFrame = (frame: VideoFrame) => {
        if (cancelled) { frame.close(); return; }
        const c = canvasRef.current;
        const cx = c?.getContext("2d");
        if (c && cx) {
          if (c.width !== frame.displayWidth || c.height !== frame.displayHeight) {
            c.width = frame.displayWidth;
            c.height = frame.displayHeight;
            videoSizeRef.current = {
              width: frame.displayWidth,
              height: frame.displayHeight,
            };
            if (!naturalSizeRef.current.width) {
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
          }
          cx.drawImage(frame, 0, 0);
          isPlayingRef.current = true;
          setStatus("playing");
          setErrorMsg(null);
          clearWd();
        }
        frame.close();
      };

      const ensureDecoder = (config: Uint8Array) => {
        if (decoderConfiguredRef.current) return;
        const codec = codecFromConfig(config);
        const desc = buildAVCConfig(config);
        try {
          decoderRef.current = new VideoDecoder({
            output: handleFrame,
            error: (e) => {
              onError?.(e instanceof Error ? e : new Error(String(e)));
              setStatus("error"); setErrorMsg(String(e));
              closeDecoder();
            },
          });
          decoderRef.current.configure({
            codec,
            ...(desc ? { description: desc } : {}),
            optimizeForLatency: true,
            hardwareAcceleration: "prefer-hardware",
          });
          decoderConfiguredRef.current = true;
        } catch (e: unknown) {
          const err = new Error(`VideoDecoder configure failed: ${e}`);
          onError?.(err); setStatus("error"); setErrorMsg(err.message);
        }
      };

      const retrySubscribe = () => {
        if (cancelled || retries >= 1) return false;
        retries++;
        subscribedRef.current = false;
        isPlayingRef.current = false;
        try { socket.emit("stream_unsubscribe", { deviceSerial }); } catch { /* ignore */ }
        closeDecoder();
        configPacketRef.current = null;
        waitingKeyRef.current = true;
        setStatus("waiting"); setErrorMsg(null);
        window.setTimeout(() => { if (!cancelled) subscribe(); }, 400);
        return true;
      };

      const armWd = () => {
        clearWd();
        watchdog = setTimeout(() => {
          if (cancelled) return;
          if (retrySubscribe()) { armWd(); return; }
          setStatus("error");
          setErrorMsg("ไม่ได้รับวิดีโอจากเครื่อง — ลองรีเฟรชหรือเชื่อมต่อใหม่");
          onError?.(new Error("stream timeout"));
        }, TIMEOUT_MS);
      };

      const bumpWd = () => { if (!isPlayingRef.current) armWd(); };

      const onMetaEvent = (p: {
        deviceSerial: string; width: number; height: number;
        deviceName: string; codec?: string;
        displayWidth?: number; displayHeight?: number;
      }) => {
        if (p.deviceSerial !== deviceSerial) return;
        videoSizeRef.current = { width: p.width, height: p.height };
        if (p.displayWidth && p.displayHeight) {
          const isLandscape = p.width > p.height;
          const pw = Math.min(p.displayWidth, p.displayHeight);
          const ph = Math.max(p.displayWidth, p.displayHeight);
          naturalSizeRef.current = isLandscape ? { width: ph, height: pw } : { width: pw, height: ph };
        } else {
          naturalSizeRef.current = { width: p.width, height: p.height };
        }
        if (canvasRef.current) { canvasRef.current.width = p.width; canvasRef.current.height = p.height; }
        onMetadata?.({ width: p.width, height: p.height, deviceName: p.deviceName, displayWidth: p.displayWidth, displayHeight: p.displayHeight });
        setStatus("waiting");
        bumpWd();
      };

      const onFrame = (p: FramePayload) => {
        if (p.deviceSerial !== deviceSerial) return;
        bumpWd();
        let bytes: Uint8Array;
        try { bytes = toUint8(p.data); } catch { return; }

        if (p.isConfig) {
          configPacketRef.current = bytes;
          closeDecoder();
          ensureDecoder(bytes);
          return;
        }
        if (!decoderConfiguredRef.current && configPacketRef.current) ensureDecoder(configPacketRef.current);
        if (!decoderRef.current || decoderRef.current.state !== "configured") return;
        if (waitingKeyRef.current) { if (!p.isKeyFrame) return; waitingKeyRef.current = false; }

        const avcc = annexBtoAvcc(bytes);
        try {
          decoderRef.current.decode(new EncodedVideoChunk({
            type: p.isKeyFrame ? "key" : "delta",
            timestamp: ptsRef.current++,
            data: avcc,
          }));
        } catch { /* ignore */ }
      };

      const onStreamError = (p: { deviceSerial: string; message: string }) => {
        if (p.deviceSerial !== deviceSerial) return;
        const msg = p.message || "";
        if (isAuthStreamError(msg)) {
          if (authRetryCount >= MAX_AUTH_RETRIES) {
            setStatus("error");
            setErrorMsg(msg);
            onError?.(new Error(msg));
            return;
          }
          authRetryCount += 1;
          subscribedRef.current = false;
          isPlayingRef.current = false;
          try { socket.emit("stream_unsubscribe", { deviceSerial }); } catch { /* ignore */ }
          setStatus("waiting");
          setErrorMsg("กำลังเชื่อมต่ออีกครั้ง...");
          clearAuthRetryTimer();
          authRetryTimer = setTimeout(() => {
            if (cancelled) return;
            trySubscribeViaAuthGate();
          }, AUTH_RETRY_DELAY_MS);
          return;
        }
        setStatus("error");
        setErrorMsg(msg);
        onError?.(new Error(msg));
      };

      function subscribe() {
        if (subscribedRef.current) return;
        subscribedRef.current = true;
        isPlayingRef.current = false;
        socket.emit("stream_subscribe", { deviceSerial });
        setStatus("waiting");
        armWd();
      }

      function trySubscribeViaAuthGate() {
        if (cancelled || subscribedRef.current) return;
        clearAuthTimeout();
        subscribe();
      }

      const armAuthTimeout = () => {
        clearAuthTimeout();
        authTimeout = setTimeout(() => {
          if (cancelled || subscribedRef.current) return;
          console.warn(
            "[AdminH264Player] authenticated timeout, subscribing anyway",
          );
          trySubscribeViaAuthGate();
        }, AUTH_TIMEOUT_MS);
      };

      const onAuthenticated = () => {
        if (cancelled) return;
        clearAuthTimeout();
        trySubscribeViaAuthGate();
      };

      const onConnect = () => {
        subscribedRef.current = false;
        isPlayingRef.current = false;
        clearAuthTimeout();
        clearAuthRetryTimer();
        setStatus("connecting");
        armAuthTimeout();
      };

      const onDisconnect = () => {
        subscribedRef.current = false;
        isPlayingRef.current = false;
        decoderConfiguredRef.current = false;
        clearWd();
        clearAuthTimeout();
        clearAuthRetryTimer();
        setStatus("connecting");
      };

      socket.on("authenticated", onAuthenticated);
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("stream_metadata", onMetaEvent);
      socket.on("stream_frame", onFrame);
      socket.on("stream_error", onStreamError);

      if (socket.connected) {
        trySubscribeViaAuthGate();
      } else {
        setStatus("connecting");
        armAuthTimeout();
      }

      return () => {
        cancelled = true;
        clearWd();
        clearAuthTimeout();
        clearAuthRetryTimer();
        try { socket.emit("stream_unsubscribe", { deviceSerial }); } catch { /* ignore */ }
        socket.off("authenticated", onAuthenticated);
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("stream_metadata", onMetaEvent);
        socket.off("stream_frame", onFrame);
        socket.off("stream_error", onStreamError);
        subscribedRef.current = false;
        closeDecoder();
        configPacketRef.current = null;
      };
    }, [deviceSerial]);

    return (
      <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/80">
            <div className={`h-8 w-8 rounded-full border-2 border-cyan-500 ${status === "error" ? "opacity-30" : "border-t-transparent animate-spin"}`} />
            <span className="text-xs text-neutral-400 text-center px-2">
              {status === "connecting" && "กำลังเชื่อมต่อ..."}
              {status === "waiting" && (errorMsg ?? "กำลังโหลดสตรีม...")}
              {status === "error" && (errorMsg ?? "ไม่สามารถโหลดสตรีมได้")}
            </span>
          </div>
        )}
      </div>
    );
  }
);
