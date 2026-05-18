import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { execFile, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import * as net from "net";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import {
  AMOTION_EVENT_ACTION_DOWN,
  AMOTION_EVENT_ACTION_MOVE,
  AMOTION_EVENT_ACTION_POINTER_DOWN,
  AMOTION_EVENT_ACTION_POINTER_UP,
  AMOTION_EVENT_ACTION_UP,
  ANDROID_KEYEVENT_ACTION_DOWN,
  ANDROID_KEYEVENT_ACTION_UP,
  serializeInjectKeycode,
  serializeInjectTouchEvent,
} from "./scrcpy-control.util";
import type { AdbInputCommand } from "./adb-screenshot.service";

const execFileAsync = promisify(execFile);

export interface FrameMeta {
  isConfig: boolean;
  isKeyFrame: boolean;
  pts: bigint;
}

export type FrameListener = (nalUnit: Buffer, meta: FrameMeta) => void;

export interface StreamMetadata {
  width: number;
  height: number;
  deviceName: string;
  codec: string;
  /** Device's logical display size in portrait-base (from `adb shell wm size`).
   *  This is the coordinate space that `adb input tap` uses.
   *  width/height above are the scaled *video* resolution (may differ due to
   *  scrcpy --max-size). Clients must use displayWidth/displayHeight (not
   *  video width/height) when computing ADB touch coordinates. */
  displayWidth?: number;
  displayHeight?: number;
  /** 0 | 90 | 180 | 270 — derived from video vs display orientation */
  rotation?: number;
}

interface ScrcpyStreamState {
  serial: string;
  port: number;
  scid: string;
  shellProcess: ChildProcess | null;
  socket: net.Socket | null;
  controlSocket: net.Socket | null;
  controlReady: boolean;
  deviceName: string;
  codecId: string;
  width: number;
  height: number;
  /** Device's logical display size (portrait base) — for ADB input coordinates */
  displayWidth: number;
  displayHeight: number;
  configPacket: Buffer | null;
  /** Latest IDR frame — replayed to new subscribers so they decode immediately */
  lastKeyFramePacket: Buffer | null;
  lastKeyFramePts: bigint;
  subscribers: Map<string, FrameListener>;
  idleTimer: NodeJS.Timeout | null;
  status: "starting" | "running" | "stopping" | "stopped";
  buffer: Buffer;
  deviceMetaReceived: boolean;
  videoHeaderReceived: boolean;
}

/**
 * ScrcpyService — H.264 streaming pipeline ผ่าน scrcpy-server.jar + adb
 *
 * Lifecycle ต่อ device:
 *  1. push scrcpy-server.jar → /data/local/tmp/
 *  2. adb forward tcp:<port> → localabstract:scrcpy_<scid>
 *  3. spawn scrcpy-server บน Android ผ่าน app_process
 *  4. TCP connect → รับ H.264 stream → fan-out ไป subscribers
 *  5. ปิดเมื่อ subscriber=0 หลัง idle timeout
 */
@Injectable()
export class ScrcpyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScrcpyService.name);
  private readonly streams = new Map<string, ScrcpyStreamState>();
  private readonly startingPromises = new Map<
    string,
    Promise<ScrcpyStreamState>
  >();
  private readonly usedPorts = new Set<number>();

  constructor(private readonly config: ConfigService) {}

  /* ─────────── env getters ─────────── */

  private get adbPath(): string {
    return this.config.get<string>("ADB_PATH") || "adb";
  }

  private get serverVersion(): string {
    return this.config.get<string>("SCRCPY_SERVER_VERSION") || "2.4";
  }

  private get jarPath(): string {
    return path.resolve(
      process.cwd(),
      "assets",
      `scrcpy-server-v${this.serverVersion}`,
    );
  }

  private get bitrate(): number {
    return parseInt(
      this.config.get<string>("SCRCPY_VIDEO_BITRATE") || "3000000",
      10,
    );
  }

  private get maxFps(): number {
    return parseInt(this.config.get<string>("SCRCPY_MAX_FPS") || "30", 10);
  }

  private get maxSize(): number {
    return parseInt(this.config.get<string>("SCRCPY_MAX_SIZE") || "1280", 10);
  }

  /** Optional encoder override — e.g. "c2.android.avc.encoder" to avoid
   *  OMX.qcom.video.encoder.avc stack-corruption crash on some Samsung/Qualcomm devices. */
  private get videoEncoder(): string {
    return this.config.get<string>("SCRCPY_VIDEO_ENCODER") || "";
  }

  private get portPoolStart(): number {
    return parseInt(
      this.config.get<string>("SCRCPY_PORT_POOL_START") || "27183",
      10,
    );
  }

  private get portPoolSize(): number {
    return parseInt(
      this.config.get<string>("SCRCPY_PORT_POOL_SIZE") || "100",
      10,
    );
  }

  private get idleTimeoutMs(): number {
    return parseInt(
      this.config.get<string>("SCRCPY_IDLE_TIMEOUT_MS") || "60000",
      10,
    );
  }

  private get maxConcurrentStreams(): number {
    return parseInt(
      this.config.get<string>("MAX_CONCURRENT_STREAMS") || "20",
      10,
    );
  }

  private get streamingMode(): string {
    return this.config.get<string>("STREAMING_MODE") || "screenshot";
  }

  /* ─────────── lifecycle ─────────── */

  isEnabled(): boolean {
    return this.streamingMode === "scrcpy";
  }

  async onModuleInit() {
    if (!this.isEnabled()) {
      this.logger.log(
        `STREAMING_MODE=${this.streamingMode} — scrcpy service idle`,
      );
      return;
    }
    this.logger.log(
      `STREAMING_MODE=scrcpy enabled — bitrate=${this.bitrate} fps=${this.maxFps} max-size=${this.maxSize}`,
    );
    if (!fs.existsSync(this.jarPath)) {
      this.logger.error(
        `scrcpy-server.jar missing at ${this.jarPath} — run: node scripts/download-scrcpy-server.js`,
      );
    }
    // Cleanup orphan adb forwards from a previous crashed run.
    // Some adb builds reject the global "adb forward --remove-all" when
    // multiple devices are connected ("more than one device/emulator"),
    // so iterate and clean up per-device using `adb devices` output.
    try {
      const { stdout } = await execFileAsync(this.adbPath, ["devices"], {
        timeout: 5000,
        windowsHide: true,
      });
      const serials = stdout
        .split(/\r?\n/)
        .slice(1) // skip header "List of devices attached"
        .map((line) => line.trim())
        .filter((line) => line.endsWith("\tdevice"))
        .map((line) => line.split("\t")[0])
        .filter(Boolean);

      for (const s of serials) {
        try {
          await execFileAsync(
            this.adbPath,
            ["-s", s, "forward", "--remove-all"],
            { timeout: 5000, windowsHide: true },
          );
        } catch (e: any) {
          this.logger.warn(
            `adb forward cleanup failed for ${s}: ${e.message}`,
          );
        }
      }
      if (serials.length === 0) {
        this.logger.warn(
          "no adb devices found at startup — connect device and try again",
        );
      } else {
        this.logger.log(
          `adb cleanup done for ${serials.length} device(s): ${serials.join(", ")}`,
        );
      }
    } catch (e: any) {
      this.logger.warn(`adb devices listing failed: ${e.message}`);
    }
  }

  async onModuleDestroy() {
    const promises = Array.from(this.streams.keys()).map((s) =>
      this.stopStream(s),
    );
    await Promise.allSettled(promises);
  }

  /* ─────────── public API ─────────── */

  /**
   * Subscribe to a device's H.264 stream.
   * Starts scrcpy if not already running. Replays cached SPS/PPS on subscribe
   * so a new client can initialize its decoder before the next keyframe.
   */
  async subscribe(
    serial: string,
    subscriberId: string,
    listener: FrameListener,
  ): Promise<{ metadata: StreamMetadata; unsubscribe: () => void }> {
    if (!this.isEnabled()) {
      throw new Error("STREAMING_MODE is not 'scrcpy'");
    }

    let stream = this.streams.get(serial);
    if (!stream) {
      let starting = this.startingPromises.get(serial);
      if (!starting) {
        if (this.streams.size >= this.maxConcurrentStreams) {
          throw new Error(
            `Reached MAX_CONCURRENT_STREAMS (${this.maxConcurrentStreams})`,
          );
        }
        starting = this.startStream(serial);
        this.startingPromises.set(serial, starting);
        starting.finally(() => this.startingPromises.delete(serial));
      }
      stream = await starting;
    }

    if (stream.idleTimer) {
      clearTimeout(stream.idleTimer);
      stream.idleTimer = null;
    }

    // Wait until scrcpy sends the video header (codec_id + width + height)
    // so the metadata we return is correct. Bounded to 5s to avoid hangs.
    await this.waitForVideoHeader(stream, 5000);

    // Stream may have died (socket closed / process crashed) during the wait.
    // Don't accept subscribers against a dead stream — caller should retry.
    if (
      stream.status === "stopped" ||
      stream.status === "stopping" ||
      !this.streams.has(serial)
    ) {
      throw new Error(
        "scrcpy stream died during startup — likely scrcpy-server crashed on the device. Check backend logs for 'stderr:' lines.",
      );
    }

    stream.subscribers.set(subscriberId, listener);

    if (stream.configPacket) {
      try {
        listener(stream.configPacket, {
          isConfig: true,
          isKeyFrame: false,
          pts: BigInt(0),
        });
      } catch (e: any) {
        this.logger.warn(`replay config to ${subscriberId} failed: ${e.message}`);
      }
    }

    // Replay last keyframe so the client can paint immediately without waiting
    // for the next GOP (often 1–2 s, sometimes longer).
    if (stream.lastKeyFramePacket) {
      try {
        listener(stream.lastKeyFramePacket, {
          isConfig: false,
          isKeyFrame: true,
          pts: stream.lastKeyFramePts,
        });
      } catch (e: any) {
        this.logger.warn(
          `replay keyframe to ${subscriberId} failed: ${e.message}`,
        );
      }
    }

    // Ensure display size is available before sending metadata to the client.
    if (stream.displayWidth <= 0 || stream.displayHeight <= 0) {
      const size = await this.getDisplaySize(serial);
      if (size) {
        stream.displayWidth = size.w;
        stream.displayHeight = size.h;
      }
    }

    this.logger.log(
      `Subscribed ${subscriberId} → ${serial} (total subscribers: ${stream.subscribers.size})` +
        (stream.displayWidth > 0
          ? ` touch=${stream.displayWidth}×${stream.displayHeight}`
          : " touch=UNKNOWN (wm size failed)"),
    );

    return {
      metadata: this.buildStreamMetadata(stream),
      unsubscribe: () => this.unsubscribe(serial, subscriberId),
    };
  }

  private waitForVideoHeader(
    state: ScrcpyStreamState,
    timeoutMs: number,
  ): Promise<void> {
    if (state.videoHeaderReceived) return Promise.resolve();
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const tick = () => {
        if (state.videoHeaderReceived) return resolve();
        // Bail early if stream died — no point waiting full timeout
        if (state.status === "stopped" || state.status === "stopping") {
          this.logger.warn(
            `[scrcpy/${state.serial}] stream died before video header arrived`,
          );
          return resolve();
        }
        if (Date.now() - startedAt >= timeoutMs) {
          this.logger.warn(
            `[scrcpy/${state.serial}] video header not received within ${timeoutMs}ms`,
          );
          return resolve();
        }
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  unsubscribe(serial: string, subscriberId: string): void {
    const stream = this.streams.get(serial);
    if (!stream) return;
    if (!stream.subscribers.delete(subscriberId)) return;

    this.logger.log(
      `Unsubscribed ${subscriberId} from ${serial} (remaining: ${stream.subscribers.size})`,
    );

    if (stream.subscribers.size === 0 && !stream.idleTimer) {
      stream.idleTimer = setTimeout(() => {
        this.stopStream(serial).catch((err) =>
          this.logger.warn(`stopStream(${serial}) failed: ${err.message}`),
        );
      }, this.idleTimeoutMs);
    }
  }

  getStreamMetadata(serial: string): StreamMetadata | null {
    const stream = this.streams.get(serial);
    if (!stream || !stream.videoHeaderReceived) return null;
    return this.buildStreamMetadata(stream);
  }

  private buildStreamMetadata(stream: ScrcpyStreamState): StreamMetadata {
    const rotation =
      stream.width > 0 && stream.height > 0
        ? stream.width >= stream.height
          ? 90
          : 0
        : 0;
    return {
      width: stream.width,
      height: stream.height,
      deviceName: stream.deviceName,
      codec: "avc1.42E01E",
      rotation,
      ...(stream.displayWidth > 0 && stream.displayHeight > 0
        ? {
            displayWidth: stream.displayWidth,
            displayHeight: stream.displayHeight,
          }
        : {}),
    };
  }

  hasActiveStream(serial: string): boolean {
    const s = this.streams.get(serial);
    return !!s && s.status === "running" && s.controlReady;
  }

  /** Low-latency touch/key via scrcpy control socket (multi-pointer capable). */
  sendInput(serial: string, cmd: AdbInputCommand): boolean {
    const stream = this.streams.get(serial);
    if (!stream?.controlReady || !stream.controlSocket) return false;

    const touchSpace = this.getTouchScreenSize(stream);
    if (!touchSpace) return false;

    try {
      switch (cmd.type) {
        case "tap": {
          const x = Math.round(Number(cmd.payload.x));
          const y = Math.round(Number(cmd.payload.y));
          this.writeControl(
            stream,
            serializeInjectTouchEvent({
              action: AMOTION_EVENT_ACTION_DOWN,
              pointerId: BigInt(0),
              x,
              y,
              ...touchSpace,
            }),
          );
          this.writeControl(
            stream,
            serializeInjectTouchEvent({
              action: AMOTION_EVENT_ACTION_UP,
              pointerId: BigInt(0),
              x,
              y,
              ...touchSpace,
            }),
          );
          return true;
        }
        case "touch": {
          const action = String(cmd.payload.action || "");
          const x = Math.round(Number(cmd.payload.x));
          const y = Math.round(Number(cmd.payload.y));
          const pointerId = BigInt(
            Math.max(0, Math.min(9, Number(cmd.payload.pointerId ?? 0))),
          );
          let motion = AMOTION_EVENT_ACTION_MOVE;
          if (action === "down") motion = AMOTION_EVENT_ACTION_DOWN;
          else if (action === "up") motion = AMOTION_EVENT_ACTION_UP;
          else if (action === "move") motion = AMOTION_EVENT_ACTION_MOVE;
          else return false;

          this.writeControl(
            stream,
            serializeInjectTouchEvent({
              action: motion,
              pointerId,
              x,
              y,
              ...touchSpace,
            }),
          );
          return true;
        }
        case "swipe": {
          const x1 = Math.round(Number(cmd.payload.x1));
          const y1 = Math.round(Number(cmd.payload.y1));
          const x2 = Math.round(Number(cmd.payload.x2));
          const y2 = Math.round(Number(cmd.payload.y2));
          const duration = Math.max(
            50,
            Math.min(800, Math.round(Number(cmd.payload.duration ?? 200))),
          );
          const steps = Math.max(2, Math.min(12, Math.round(duration / 40)));
          this.writeControl(
            stream,
            serializeInjectTouchEvent({
              action: AMOTION_EVENT_ACTION_DOWN,
              pointerId: BigInt(0),
              x: x1,
              y: y1,
              ...touchSpace,
            }),
          );
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            this.writeControl(
              stream,
              serializeInjectTouchEvent({
                action: AMOTION_EVENT_ACTION_MOVE,
                pointerId: BigInt(0),
                x: Math.round(x1 + (x2 - x1) * t),
                y: Math.round(y1 + (y2 - y1) * t),
                ...touchSpace,
              }),
            );
          }
          this.writeControl(
            stream,
            serializeInjectTouchEvent({
              action: AMOTION_EVENT_ACTION_UP,
              pointerId: BigInt(0),
              x: x2,
              y: y2,
              ...touchSpace,
            }),
          );
          return true;
        }
        case "key": {
          const keycode = Math.round(Number(cmd.payload.keycode));
          this.writeControl(
            stream,
            serializeInjectKeycode({
              action: ANDROID_KEYEVENT_ACTION_DOWN,
              keycode,
            }),
          );
          this.writeControl(
            stream,
            serializeInjectKeycode({
              action: ANDROID_KEYEVENT_ACTION_UP,
              keycode,
            }),
          );
          return true;
        }
        default:
          return false;
      }
    } catch (e: any) {
      this.logger.warn(`scrcpy sendInput(${serial}) failed: ${e.message}`);
      return false;
    }
  }

  /** Multi-pointer helpers for WebSocket batch input. */
  sendPointerDown(
    serial: string,
    pointerId: number,
    x: number,
    y: number,
    isFirst: boolean,
  ): boolean {
    const stream = this.streams.get(serial);
    if (!stream?.controlReady || !stream.controlSocket) return false;
    const touchSpace = this.getTouchScreenSize(stream);
    if (!touchSpace) return false;
    const action = isFirst
      ? AMOTION_EVENT_ACTION_DOWN
      : AMOTION_EVENT_ACTION_POINTER_DOWN;
    this.writeControl(
      stream,
      serializeInjectTouchEvent({
        action,
        pointerId: BigInt(pointerId),
        x,
        y,
        ...touchSpace,
      }),
    );
    return true;
  }

  sendPointerUp(
    serial: string,
    pointerId: number,
    x: number,
    y: number,
    isLast: boolean,
  ): boolean {
    const stream = this.streams.get(serial);
    if (!stream?.controlReady || !stream.controlSocket) return false;
    const touchSpace = this.getTouchScreenSize(stream);
    if (!touchSpace) return false;
    const action = isLast
      ? AMOTION_EVENT_ACTION_UP
      : AMOTION_EVENT_ACTION_POINTER_UP;
    this.writeControl(
      stream,
      serializeInjectTouchEvent({
        action,
        pointerId: BigInt(pointerId),
        x,
        y,
        ...touchSpace,
      }),
    );
    return true;
  }

  sendPointerMove(
    serial: string,
    pointerId: number,
    x: number,
    y: number,
  ): boolean {
    const stream = this.streams.get(serial);
    if (!stream?.controlReady || !stream.controlSocket) return false;
    const touchSpace = this.getTouchScreenSize(stream);
    if (!touchSpace) return false;
    this.writeControl(
      stream,
      serializeInjectTouchEvent({
        action: AMOTION_EVENT_ACTION_MOVE,
        pointerId: BigInt(pointerId),
        x,
        y,
        ...touchSpace,
      }),
    );
    return true;
  }

  private getTouchScreenSize(
    stream: ScrcpyStreamState,
  ): { screenWidth: number; screenHeight: number } | null {
    if (stream.width > 0 && stream.height > 0) {
      return { screenWidth: stream.width, screenHeight: stream.height };
    }
    if (stream.displayWidth > 0 && stream.displayHeight > 0) {
      const portraitW = Math.min(stream.displayWidth, stream.displayHeight);
      const portraitH = Math.max(stream.displayWidth, stream.displayHeight);
      const landscape = stream.width > stream.height;
      return landscape
        ? { screenWidth: portraitH, screenHeight: portraitW }
        : { screenWidth: portraitW, screenHeight: portraitH };
    }
    return null;
  }

  private writeControl(stream: ScrcpyStreamState, packet: Buffer): void {
    if (!stream.controlSocket?.writable) return;
    stream.controlSocket.write(packet);
  }

  private async connectControlSocket(
    state: ScrcpyStreamState,
    port: number,
  ): Promise<void> {
    try {
      const sock = await this.connectSocket(port);
      state.controlSocket = sock;
      sock.on("error", (err) => {
        this.logger.warn(
          `[scrcpy/${state.serial}] control socket error: ${err.message}`,
        );
        state.controlReady = false;
      });
      sock.on("close", () => {
        state.controlReady = false;
      });
      // Optional dummy byte on control connection (send_dummy_byte=true).
      await new Promise<void>((resolve) => {
        const onData = (chunk: Buffer) => {
          sock.off("data", onData);
          resolve();
        };
        sock.once("data", onData);
        setTimeout(() => {
          sock.off("data", onData);
          resolve();
        }, 400);
      });
      state.controlReady = true;
      this.logger.log(`[scrcpy/${state.serial}] control channel ready`);
    } catch (e: any) {
      this.logger.warn(
        `[scrcpy/${state.serial}] control channel failed: ${e.message}`,
      );
      state.controlReady = false;
    }
  }

  listActiveStreams(): Array<{
    serial: string;
    port: number;
    subscribers: number;
    status: string;
  }> {
    return Array.from(this.streams.values()).map((s) => ({
      serial: s.serial,
      port: s.port,
      subscribers: s.subscribers.size,
      status: s.status,
    }));
  }

  /* ─────────── internals ─────────── */

  /**
   * Get the device's logical display size (what `adb input tap` uses as its
   * coordinate space).  `adb shell wm size` always returns the portrait-base
   * size regardless of current orientation.  We cache the result per serial
   * since it never changes during a session.
   */
  private displaySizeCache = new Map<string, { w: number; h: number }>();

  private async getDisplaySize(
    serial: string,
  ): Promise<{ w: number; h: number } | null> {
    if (this.displaySizeCache.has(serial)) {
      return this.displaySizeCache.get(serial)!;
    }
    try {
      const { stdout } = await execFileAsync(
        this.adbPath,
        ["-s", serial, "shell", "wm", "size"],
        { timeout: 4000, windowsHide: true },
      );
      // Prefer "Override size" (user-set custom resolution); fallback to "Physical size"
      const m =
        stdout.match(/Override size:\s*(\d+)x(\d+)/) ||
        stdout.match(/Physical size:\s*(\d+)x(\d+)/);
      if (m) {
        const size = { w: parseInt(m[1], 10), h: parseInt(m[2], 10) };
        this.displaySizeCache.set(serial, size);
        this.logger.log(
          `Display size for ${serial}: ${size.w}×${size.h} (ADB input space)`,
        );
        return size;
      }
    } catch (e: any) {
      this.logger.warn(`getDisplaySize(${serial}) failed: ${e.message}`);
    }
    return null;
  }

  private allocatePort(): number {
    for (let i = 0; i < this.portPoolSize; i++) {
      const port = this.portPoolStart + i;
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error("scrcpy port pool exhausted");
  }

  private releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  private async startStream(serial: string): Promise<ScrcpyStreamState> {
    this.logger.log(`Starting scrcpy stream for ${serial}`);

    if (!fs.existsSync(this.jarPath)) {
      throw new Error(
        `scrcpy-server.jar not found at ${this.jarPath} — run scripts/download-scrcpy-server.js`,
      );
    }

    const port = this.allocatePort();
    // scrcpy-server parses scid as Integer.parseInt(value, 16), so it must
    // be a 31-bit non-negative value (≤ 0x7FFFFFFF). Mask the top bit.
    const scid = (crypto.randomBytes(4).readUInt32BE(0) & 0x7fffffff)
      .toString(16)
      .padStart(8, "0");

    // Fetch device's logical display size early — needed for ADB touch coordinates.
    // `adb input tap` uses this coordinate space, NOT the scaled video resolution.
    const displaySize = await this.getDisplaySize(serial);

    const state: ScrcpyStreamState = {
      serial,
      port,
      scid,
      shellProcess: null,
      socket: null,
      controlSocket: null,
      controlReady: false,
      deviceName: "",
      codecId: "",
      width: 0,
      height: 0,
      displayWidth: displaySize?.w ?? 0,
      displayHeight: displaySize?.h ?? 0,
      configPacket: null,
      lastKeyFramePacket: null,
      lastKeyFramePts: BigInt(0),
      subscribers: new Map(),
      idleTimer: null,
      status: "starting",
      buffer: Buffer.alloc(0),
      deviceMetaReceived: false,
      videoHeaderReceived: false,
    };

    this.streams.set(serial, state);

    try {
      // 0) Kill any orphan scrcpy server still running on the device from a
      // previous crashed/restarted backend. Ignore exit code (pkill returns 1
      // if no match — that's normal).
      try {
        await execFileAsync(
          this.adbPath,
          [
            "-s",
            serial,
            "shell",
            "pkill",
            "-f",
            "com.genymobile.scrcpy.Server",
          ],
          { timeout: 3000, windowsHide: true },
        );
      } catch {
        // no orphan — fine
      }

      // 1) push scrcpy-server.jar to device
      await execFileAsync(
        this.adbPath,
        [
          "-s",
          serial,
          "push",
          this.jarPath,
          "/data/local/tmp/scrcpy-server.jar",
        ],
        { timeout: 15000, windowsHide: true },
      );

      // 2) adb forward host port → device abstract socket
      const abstractName = `scrcpy_${scid}`;
      await execFileAsync(
        this.adbPath,
        [
          "-s",
          serial,
          "forward",
          `tcp:${port}`,
          `localabstract:${abstractName}`,
        ],
        { timeout: 5000, windowsHide: true },
      );

      // 3) spawn scrcpy server on Android via app_process
      const scrcpyArgs = [
        "-s",
        serial,
        "shell",
        "CLASSPATH=/data/local/tmp/scrcpy-server.jar",
        "app_process",
        "/",
        "com.genymobile.scrcpy.Server",
        this.serverVersion,
        `scid=${scid}`,
        "tunnel_forward=true",
        "video=true",
        "audio=false",
        "control=true",
        "cleanup=true",
        `video_bit_rate=${this.bitrate}`,
        `max_fps=${this.maxFps}`,
        `max_size=${this.maxSize}`,
        "video_codec=h264",
        "send_device_meta=true",
        "send_frame_meta=true",
        "send_dummy_byte=true",
        "send_codec_meta=true",
      ];

      // Allow overriding the video encoder to work around OMX crashes on
      // some Samsung/Qualcomm devices (e.g. OMX.qcom.video.encoder.avc
      // causes stack corruption on Android 10 + scrcpy 2.4).
      if (this.videoEncoder) {
        scrcpyArgs.push(`video_encoder=${this.videoEncoder}`);
      }

      this.logger.log(
        `[scrcpy/${serial}] launching: adb ${scrcpyArgs.slice(0, 3).join(" ")} ... scid=${scid}` +
          (this.videoEncoder ? ` encoder=${this.videoEncoder}` : ""),
      );

      state.shellProcess = spawn(this.adbPath, scrcpyArgs, {
        windowsHide: true,
      });

      state.shellProcess.stdout?.on("data", (d: Buffer) => {
        const msg = d.toString("utf8").trim();
        if (msg) this.logger.log(`[scrcpy/${serial}] stdout: ${msg}`);
      });
      state.shellProcess.stderr?.on("data", (d: Buffer) => {
        const msg = d.toString("utf8").trim();
        if (msg) this.logger.warn(`[scrcpy/${serial}] stderr: ${msg}`);
      });
      state.shellProcess.on("exit", (code, sig) => {
        this.logger.warn(
          `[scrcpy/${serial}] server process exited code=${code} sig=${sig}`,
        );
        if (state.status === "running" || state.status === "starting") {
          this.stopStream(serial).catch(() => {});
        }
      });

      // 4) give server a moment to bind socket before we connect.
      // Phones with slower app_process startup (or first run after push) can
      // take >1s, so be generous here. connectSocket retries internally too.
      await new Promise((r) => setTimeout(r, 1500));

      // 5) connect TCP to forwarded port (video), then control (second connection)
      state.socket = await this.connectSocket(port);
      void this.connectControlSocket(state, port);
      state.socket.on("data", (chunk) => this.handleData(state, chunk));
      state.socket.on("error", (err) => {
        this.logger.warn(`[scrcpy/${serial}] socket error: ${err.message}`);
      });
      state.socket.on("close", () => {
        this.logger.warn(`[scrcpy/${serial}] socket closed`);
        if (state.status === "running" || state.status === "starting") {
          this.stopStream(serial).catch(() => {});
        }
      });

      state.status = "running";
      this.logger.log(`scrcpy stream live for ${serial} on port ${port}`);
      return state;
    } catch (err: any) {
      this.logger.error(
        `Failed to start scrcpy for ${serial}: ${err.message}`,
      );
      await this.stopStream(serial).catch(() => {});
      throw err;
    }
  }

  private connectSocket(port: number, retries = 8): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      let attempt = 0;
      const tryConnect = () => {
        const sock = net.createConnection(port, "127.0.0.1");
        const onError = (err: Error) => {
          sock.destroy();
          attempt += 1;
          if (attempt >= retries) {
            reject(
              new Error(
                `connect to scrcpy on :${port} failed after ${retries}x: ${err.message}`,
              ),
            );
            return;
          }
          setTimeout(tryConnect, 300);
        };
        sock.once("error", onError);
        sock.once("connect", () => {
          sock.off("error", onError);
          resolve(sock);
        });
      };
      tryConnect();
    });
  }

  private handleData(state: ScrcpyStreamState, chunk: Buffer): void {
    state.buffer = Buffer.concat([state.buffer, chunk]);

    // scrcpy v2.x protocol order (send_dummy_byte=true, send_device_meta=true):
    //   1) dummy byte (1)
    //   2) device meta: name (DEVICE_NAME_FIELD_LENGTH = 64)
    //   3) video stream header: codec_id (4) + width (4) + height (4) = 12
    //   4) repeated frame: pts+flags (8) + size (4) + payload(size)
    if (!state.deviceMetaReceived) {
      const DEVICE_META_LEN = 1 + 64;
      if (state.buffer.length < DEVICE_META_LEN) return;
      const nameBuf = state.buffer.slice(1, 65);
      const nullIdx = nameBuf.indexOf(0);
      state.deviceName = nameBuf
        .slice(0, nullIdx === -1 ? 64 : nullIdx)
        .toString("utf8");
      state.buffer = state.buffer.slice(DEVICE_META_LEN);
      state.deviceMetaReceived = true;
    }

    if (!state.videoHeaderReceived) {
      const VIDEO_HEADER_LEN = 12;
      if (state.buffer.length < VIDEO_HEADER_LEN) return;
      // codec_id is 4-byte ASCII tag (e.g. 0x68323634 = "h264")
      const codecIdBuf = state.buffer.slice(0, 4);
      const codecAscii = codecIdBuf.toString("ascii").replace(/\0+$/, "");
      state.codecId = codecAscii || codecIdBuf.toString("hex");
      state.width = state.buffer.readUInt32BE(4);
      state.height = state.buffer.readUInt32BE(8);
      state.buffer = state.buffer.slice(VIDEO_HEADER_LEN);
      state.videoHeaderReceived = true;
      this.logger.log(
        `[scrcpy/${state.serial}] meta: name="${state.deviceName}" codec=${state.codecId} ${state.width}x${state.height}`,
      );
    }

    // Each frame: 8 bytes PTS (with flags in top bits) + 4 bytes size + payload
    const FRAME_HEADER_LEN = 12;
    const ZERO = BigInt(0);
    const PTS_FLAG_CONFIG = BigInt(1) << BigInt(63);
    const PTS_FLAG_KEY = BigInt(1) << BigInt(62);
    const PTS_FLAGS_MASK = ~(PTS_FLAG_CONFIG | PTS_FLAG_KEY);

    while (state.buffer.length >= FRAME_HEADER_LEN) {
      const ptsRaw = state.buffer.readBigUInt64BE(0);
      const size = state.buffer.readUInt32BE(8);
      if (state.buffer.length < FRAME_HEADER_LEN + size) break;

      const isConfig = (ptsRaw & PTS_FLAG_CONFIG) !== ZERO;
      const isKeyFrame = (ptsRaw & PTS_FLAG_KEY) !== ZERO;
      const pts = ptsRaw & PTS_FLAGS_MASK;

      const payload = Buffer.from(
        state.buffer.slice(FRAME_HEADER_LEN, FRAME_HEADER_LEN + size),
      );
      state.buffer = state.buffer.slice(FRAME_HEADER_LEN + size);

      const meta: FrameMeta = { isConfig, isKeyFrame, pts };

      // Cache SPS/PPS so late subscribers can initialize their decoder
      if (isConfig) state.configPacket = payload;
      if (isKeyFrame && !isConfig) {
        state.lastKeyFramePacket = payload;
        state.lastKeyFramePts = pts;
      }

      state.subscribers.forEach((listener) => {
        try {
          listener(payload, meta);
        } catch (e: any) {
          this.logger.warn(`subscriber listener threw: ${e.message}`);
        }
      });
    }
  }

  private async stopStream(serial: string): Promise<void> {
    const state = this.streams.get(serial);
    if (!state) return;
    if (state.status === "stopping" || state.status === "stopped") return;
    state.status = "stopping";

    this.logger.log(`Stopping scrcpy stream for ${serial}`);

    if (state.idleTimer) {
      clearTimeout(state.idleTimer);
      state.idleTimer = null;
    }

    if (state.socket) {
      try {
        state.socket.destroy();
      } catch {
        // ignore
      }
      state.socket = null;
    }

    if (state.controlSocket) {
      try {
        state.controlSocket.destroy();
      } catch {
        // ignore
      }
      state.controlSocket = null;
      state.controlReady = false;
    }

    if (state.shellProcess) {
      try {
        state.shellProcess.kill("SIGTERM");
        await new Promise((r) => setTimeout(r, 200));
        if (state.shellProcess.exitCode === null) {
          state.shellProcess.kill("SIGKILL");
        }
      } catch {
        // ignore
      }
      state.shellProcess = null;
    }

    // Ensure server process on the device is gone (pkill returns nonzero if no match — that's fine).
    try {
      await execFileAsync(
        this.adbPath,
        [
          "-s",
          serial,
          "shell",
          "pkill",
          "-f",
          "com.genymobile.scrcpy.Server",
        ],
        { timeout: 3000, windowsHide: true },
      );
    } catch {
      // ignore
    }

    try {
      await execFileAsync(
        this.adbPath,
        ["-s", serial, "forward", "--remove", `tcp:${state.port}`],
        { timeout: 3000, windowsHide: true },
      );
    } catch {
      // ignore
    }

    this.releasePort(state.port);
    state.subscribers.clear();
    state.status = "stopped";
    this.streams.delete(serial);
    this.logger.log(`scrcpy stream stopped for ${serial}`);
  }
}
