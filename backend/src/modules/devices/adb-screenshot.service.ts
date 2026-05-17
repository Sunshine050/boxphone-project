import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { execFile, exec } from "child_process";
import { promisify } from "util";
import {
  DEFAULT_SCREENSHOT_CACHE_TTL_MS,
  DEFAULT_SCREENSHOT_MAX_CONCURRENT,
  PLACEHOLDER_PNG,
} from "./constants/screenshot.constants";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export interface AdbInputCommand {
  type: "tap" | "swipe" | "touch" | "key" | "text";
  /** tap: {x,y} swipe: {x1,y1,x2,y2,duration?} touch: {action,x,y} key: {keycode} text: {value} */
  payload: Record<string, any>;
}

type TouchGestureState = {
  active: boolean;
  lastX: number;
  lastY: number;
};

/** Re-export สำหรับ module อื่นที่ต้องการเทียบ placeholder */
export { PLACEHOLDER_PNG };

@Injectable()
export class AdbScreenshotService {
  private readonly logger = new Logger(AdbScreenshotService.name);
  private readonly screenshotCache = new Map<
    string,
    { buffer: Buffer; at: number }
  >();
  private screenshotRunning = 0;
  private readonly inputChains = new Map<string, Promise<void>>();
  private readonly touchGestures = new Map<string, TouchGestureState>();
  /** Latest MOVE position while a drain loop is running (Samsung / high-rate touch). */
  private readonly touchMoveLatest = new Map<string, { x: number; y: number }>();
  private readonly touchMoveDraining = new Map<string, boolean>();
  /** Per-device: swipe segments work reliably on Samsung; motionevent is optional. */
  private readonly touchTransport = new Map<string, "swipe" | "motionevent">();
  private readonly screenshotQueue: Array<() => void> = [];

  constructor(private readonly configService: ConfigService) {}

  private async acquireScreenshotSlot(): Promise<void> {
    const max =
      this.configService.get<number>("SCREENSHOT_MAX_CONCURRENT") ??
      DEFAULT_SCREENSHOT_MAX_CONCURRENT;
    if (this.screenshotRunning < max) {
      this.screenshotRunning++;
      return;
    }
    return new Promise((resolve) => {
      this.screenshotQueue.push(() => {
        this.screenshotRunning++;
        resolve();
      });
    });
  }

  private releaseScreenshotSlot(): void {
    const max =
      this.configService.get<number>("SCREENSHOT_MAX_CONCURRENT") ??
      DEFAULT_SCREENSHOT_MAX_CONCURRENT;
    this.screenshotRunning--;
    if (this.screenshotQueue.length > 0 && this.screenshotRunning < max) {
      const next = this.screenshotQueue.shift()!;
      next();
    }
  }

  /** รายการ serial ที่ `adb devices` ขึ้น status device (USB / เครือข่าย) */
  private async listAdbDeviceSerials(): Promise<string[]> {
    const adbPath = this.configService.get<string>("ADB_PATH") || "adb";
    try {
      const { stdout } = await execFileAsync(adbPath, ["devices"], {
        encoding: "utf8",
        timeout: 8000,
        windowsHide: true,
      });
      const serials: string[] = [];
      for (const line of String(stdout).split(/\r?\n/)) {
        const m = line.trim().match(/^(\S+)\s+device\s*$/);
        if (m) serials.push(m[1]);
      }
      return serials;
    } catch (e: any) {
      this.logger.warn(`[SCREENSHOT] adb devices failed: ${e.message}`);
      return [];
    }
  }

  /**
   * ถ้า serial ใน DB ไม่อยู่ในรายการ adb แต่มีเครื่องเดียวเสียบ USB อยู่
   * ให้ใช้ serial นั้นแทน — ภาพหน้าจอจะเป็นจอมือถือที่เสียบจริง
   */
  private async resolveSerialForScreencap(
    requestedSerial: string,
  ): Promise<string> {
    const trimmed = (requestedSerial || "").trim();
    if (!trimmed) return trimmed;
    const online = await this.listAdbDeviceSerials();
    if (online.includes(trimmed)) return trimmed;
    if (online.length === 1) {
      this.logger.log(
        `[SCREENSHOT] DB serial "${trimmed}" not in ADB list; using sole connected device "${online[0]}"`,
      );
      return online[0];
    }
    return trimmed;
  }

  /**
   * ดึงหน้าจอผ่าน ADB พร้อมแคชภาพแบบ TTL และจำกัด concurrent
   */
  async fetchScreenshotForSerial(serial: string): Promise<Buffer> {
    const effective = await this.resolveSerialForScreencap(serial);
    const ttlMs =
      this.configService.get<number>("SCREENSHOT_CACHE_TTL_MS") ??
      DEFAULT_SCREENSHOT_CACHE_TTL_MS;
    const cached = this.screenshotCache.get(effective);
    if (cached && Date.now() - cached.at < ttlMs) {
      this.logger.debug(`[SCREENSHOT] Cache hit for ${effective}`);
      return cached.buffer;
    }
    await this.acquireScreenshotSlot();
    try {
      const screenshot = await this.screenshotViaAdb(effective);
      if (screenshot && screenshot.length > 0) {
        this.screenshotCache.set(effective, {
          buffer: screenshot,
          at: Date.now(),
        });
        this.logger.log(
          `[SCREENSHOT] Fetched via ADB, ${screenshot.length} bytes`,
        );
        return screenshot;
      }
    } catch (e: any) {
      this.logger.warn(
        `[SCREENSHOT] ADB failed for ${effective}: ${e.message}`,
      );
    } finally {
      this.releaseScreenshotSlot();
    }
    this.logger.warn(
      `[SCREENSHOT] No screenshot for ${effective}, returning placeholder`,
    );
    return PLACEHOLDER_PNG;
  }

  /** ลบ cache ของ serial นั้นทันทีเพื่อให้ screenshot ถัดไปดึงใหม่ */
  clearCacheForSerial(serial: string): void {
    this.screenshotCache.delete(serial);
    this.logger.debug(`[SCREENSHOT] Cache cleared for ${serial}`);
  }

  /** ดึงหน้าจอผ่าน ADB แบบ async — ไม่บล็อก event loop */
  private async screenshotViaAdb(serial: string): Promise<Buffer> {
    const adbPath = this.configService.get<string>("ADB_PATH") || "adb";
    const opts = {
      encoding: "buffer" as const,
      timeout: 15000,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    };
    try {
      this.logger.debug(
        `[SCREENSHOT] ADB exec-out screencap -p for ${serial} (adb: ${adbPath})`,
      );
      const { stdout: out } = await execFileAsync(
        adbPath,
        ["-s", serial, "exec-out", "screencap", "-p"],
        opts,
      );
      if (Buffer.isBuffer(out) && out.length > 0) {
        this.logger.log(`[SCREENSHOT] ADB exec-out OK - ${out.length} bytes`);
        return out;
      }
    } catch (e1: any) {
      this.logger.debug(
        `[SCREENSHOT] exec-out failed: ${e1.message}, trying shell screencap -p`,
      );
      try {
        const { stdout: out } = await execAsync(
          `${adbPath} -s ${serial} shell screencap -p`,
          { encoding: "buffer", timeout: 15000, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
        );
        if (Buffer.isBuffer(out) && out.length > 0) {
          this.logger.log(
            `[SCREENSHOT] ADB shell screencap OK - ${out.length} bytes`,
          );
          return out;
        }
      } catch (e2: any) {
        this.logger.warn(`[SCREENSHOT] ADB shell failed: ${e2.message}`);
      }
      throw new Error(`ADB screencap failed: ${e1.message}`);
    }
    throw new Error("ADB screencap returned empty");
  }

  /* ==============================
       ADB INPUT CONTROL
    ============================== */

  /**
   * ส่งคำสั่ง input ไปยังเครื่อง Android ผ่าน ADB
   * type: 'tap' | 'swipe' | 'key' | 'text'
   */
  async sendInput(serial: string, cmd: AdbInputCommand): Promise<void> {
    if (cmd.type === "touch" && cmd.payload?.action === "move") {
      const x = Math.round(Number(cmd.payload.x));
      const y = Math.round(Number(cmd.payload.y));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      this.touchMoveLatest.set(serial, { x, y });
      void this.drainTouchMoves(serial);
      return;
    }

    const run = () => this.execInput(serial, cmd);
    const prev = this.inputChains.get(serial) ?? Promise.resolve();
    const next = prev.then(run, run);
    this.inputChains.set(
      serial,
      next.catch(() => {
        /* keep chain alive after errors */
      }),
    );
    await next;
  }

  private async drainTouchMoves(serial: string): Promise<void> {
    if (this.touchMoveDraining.get(serial)) return;
    this.touchMoveDraining.set(serial, true);
    try {
      while (this.touchMoveLatest.has(serial)) {
        const pos = this.touchMoveLatest.get(serial)!;
        this.touchMoveLatest.delete(serial);
        await this.execInput(serial, {
          type: "touch",
          payload: { action: "move", x: pos.x, y: pos.y },
        });
      }
    } finally {
      this.touchMoveDraining.set(serial, false);
      if (this.touchMoveLatest.has(serial)) {
        void this.drainTouchMoves(serial);
      }
    }
  }

  private getTouchTransport(serial: string): "swipe" | "motionevent" {
    const configured = this.configService.get<string>("ADB_TOUCH_MODE");
    if (configured === "motionevent") return "motionevent";
    if (configured === "swipe") return "swipe";
    return this.touchTransport.get(serial) ?? "swipe";
  }

  private async execInput(serial: string, cmd: AdbInputCommand): Promise<void> {
    const effective = await this.resolveSerialForScreencap(serial);
    const adbPath = this.configService.get<string>("ADB_PATH") || "adb";
    const base = ["-s", effective, "shell", "input"];
    let args: string[] | null = null;

    switch (cmd.type) {
      case "tap": {
        const x = Math.round(Number(cmd.payload.x));
        const y = Math.round(Number(cmd.payload.y));
        await this.execTap(adbPath, base, effective, x, y);
        return;
      }
      case "swipe": {
        const { x1, y1, x2, y2, duration = 200 } = cmd.payload;
        args = [
          ...base,
          "swipe",
          String(Math.round(x1)),
          String(Math.round(y1)),
          String(Math.round(x2)),
          String(Math.round(y2)),
          String(Math.max(1, Math.round(duration))),
        ];
        break;
      }
      case "touch": {
        await this.execTouch(
          adbPath,
          base,
          effective,
          serial,
          cmd.payload?.action,
          Math.round(Number(cmd.payload.x)),
          Math.round(Number(cmd.payload.y)),
        );
        return;
      }
      case "key": {
        args = [...base, "keyevent", String(cmd.payload.keycode)];
        break;
      }
      case "text": {
        const escaped = String(cmd.payload.value).replace(/ /g, "%s");
        args = [...base, "text", escaped];
        break;
      }
      default:
        throw new Error(`Unknown input type: ${(cmd as any).type}`);
    }

    if (!args) return;

    this.logger.debug(`[INPUT] adb ${args.join(" ")}`);
    const timeoutMs = 8000;
    const opts = { timeout: timeoutMs, windowsHide: true };

    try {
      const { stderr } = await execFileAsync(adbPath, args, opts as any);
      if (stderr) this.logger.warn(`[INPUT] stderr: ${stderr}`);
    } catch (err: any) {
      throw err;
    }
  }

  private async execTap(
    adbPath: string,
    base: string[],
    effective: string,
    x: number,
    y: number,
  ): Promise<void> {
    const opts = { timeout: 3000, windowsHide: true };
    const attempts: string[][] = [
      [...base, "tap", String(x), String(y)],
      [...base, "touchscreen", "tap", String(x), String(y)],
    ];
    let lastErr: Error | null = null;
    for (const args of attempts) {
      try {
        this.logger.debug(`[INPUT] adb ${args.join(" ")}`);
        const { stderr } = await execFileAsync(adbPath, args, opts as any);
        if (stderr) this.logger.warn(`[INPUT] tap stderr: ${stderr}`);
        return;
      } catch (e: any) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("tap failed");
  }

  private async execTouch(
    adbPath: string,
    base: string[],
    effective: string,
    serial: string,
    action: string,
    x: number,
    y: number,
  ): Promise<void> {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error("touch requires numeric x,y");
    }

    const transport = this.getTouchTransport(serial);
    if (transport === "swipe") {
      await this.execTouchSwipe(adbPath, base, effective, action, x, y);
      return;
    }

    try {
      await this.execTouchMotionEvent(adbPath, base, effective, action, x, y);
    } catch (err: any) {
      this.logger.warn(
        `[INPUT] motionevent failed on ${effective}, switching to swipe: ${err?.message || err}`,
      );
      this.touchTransport.set(serial, "swipe");
      await this.execTouchSwipe(adbPath, base, effective, action, x, y);
    }
  }

  /** Samsung / Galaxy Note friendly — short swipe segments simulate drag. */
  private async execTouchSwipe(
    adbPath: string,
    base: string[],
    effective: string,
    action: string,
    x: number,
    y: number,
  ): Promise<void> {
    const opts = { timeout: 1800, windowsHide: true };
    const gesture = this.touchGestures.get(effective) ?? {
      active: false,
      lastX: x,
      lastY: y,
    };

    if (action === "down") {
      gesture.active = true;
      gesture.lastX = x;
      gesture.lastY = y;
      this.touchGestures.set(effective, gesture);
      const args = [
        ...base,
        "swipe",
        String(x),
        String(y),
        String(x),
        String(y),
        "1",
      ];
      this.logger.debug(`[INPUT] adb ${args.join(" ")}`);
      await execFileAsync(adbPath, args, opts as any);
      return;
    }

    if (action === "move") {
      if (!gesture.active) return;
      if (gesture.lastX === x && gesture.lastY === y) return;
      const args = [
        ...base,
        "swipe",
        String(gesture.lastX),
        String(gesture.lastY),
        String(x),
        String(y),
        "1",
      ];
      gesture.lastX = x;
      gesture.lastY = y;
      this.touchGestures.set(effective, gesture);
      this.logger.debug(`[INPUT] adb ${args.join(" ")}`);
      await execFileAsync(adbPath, args, opts as any);
      return;
    }

    if (action === "up") {
      if (gesture.active) {
        const args = [
          ...base,
          "swipe",
          String(gesture.lastX),
          String(gesture.lastY),
          String(x),
          String(y),
          "1",
        ];
        this.logger.debug(`[INPUT] adb ${args.join(" ")}`);
        await execFileAsync(adbPath, args, opts as any);
      }
      gesture.active = false;
      this.touchGestures.set(effective, gesture);
      return;
    }

    throw new Error(`Unknown touch action: ${action}`);
  }

  private async execTouchMotionEvent(
    adbPath: string,
    base: string[],
    effective: string,
    action: string,
    x: number,
    y: number,
  ): Promise<void> {
    const opts = { timeout: 1800, windowsHide: true };
    const gesture = this.touchGestures.get(effective) ?? {
      active: false,
      lastX: x,
      lastY: y,
    };

    const motionArgs = (label: string): string[] => [
      ...base,
      "motionevent",
      label,
      String(x),
      String(y),
    ];

    if (action === "down") {
      gesture.active = true;
      gesture.lastX = x;
      gesture.lastY = y;
      this.touchGestures.set(effective, gesture);
      await this.runMotionEvent(adbPath, motionArgs("DOWN"), opts);
      return;
    }

    if (action === "move") {
      if (!gesture.active) return;
      if (gesture.lastX === x && gesture.lastY === y) return;
      gesture.lastX = x;
      gesture.lastY = y;
      this.touchGestures.set(effective, gesture);
      await this.runMotionEvent(adbPath, motionArgs("MOVE"), opts);
      return;
    }

    if (action === "up") {
      gesture.active = false;
      this.touchGestures.set(effective, gesture);
      await this.runMotionEvent(adbPath, motionArgs("UP"), opts);
      return;
    }

    throw new Error(`Unknown touch action: ${action}`);
  }

  private async runMotionEvent(
    adbPath: string,
    args: string[],
    opts: { timeout: number; windowsHide: boolean },
  ): Promise<void> {
    try {
      this.logger.debug(`[INPUT] adb ${args.join(" ")}`);
      await execFileAsync(adbPath, args, opts as any);
    } catch {
      const label = args[5];
      const numericAction =
        label === "DOWN" ? "0" : label === "UP" ? "1" : "2";
      const alt = [...args.slice(0, 5), numericAction, ...args.slice(6)];
      this.logger.debug(`[INPUT] adb ${alt.join(" ")} (numeric)`);
      await execFileAsync(adbPath, alt, opts as any);
    }
  }
}
