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
  private readonly touchMovePending = new Map<
    string,
    { x: number; y: number; timer: ReturnType<typeof setTimeout> }
  >();
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
      this.scheduleTouchMove(serial, cmd);
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

  private scheduleTouchMove(serial: string, cmd: AdbInputCommand): void {
    const x = Math.round(Number(cmd.payload.x));
    const y = Math.round(Number(cmd.payload.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const existing = this.touchMovePending.get(serial);
    if (existing) {
      clearTimeout(existing.timer);
    }

    const timer = setTimeout(() => {
      this.touchMovePending.delete(serial);
      const moveCmd: AdbInputCommand = {
        type: "touch",
        payload: { action: "move", x, y },
      };
      const run = () => this.execInput(serial, moveCmd);
      const prev = this.inputChains.get(serial) ?? Promise.resolve();
      const next = prev.then(run, run);
      this.inputChains.set(serial, next.catch(() => {}));
    }, 10);

    this.touchMovePending.set(serial, { x, y, timer });
  }

  private async execInput(serial: string, cmd: AdbInputCommand): Promise<void> {
    const effective = await this.resolveSerialForScreencap(serial);
    const adbPath = this.configService.get<string>("ADB_PATH") || "adb";
    const base = ["-s", effective, "shell", "input"];
    let args: string[] | null = null;

    switch (cmd.type) {
      case "tap": {
        const { x, y } = cmd.payload;
        args = [...base, "tap", String(Math.round(x)), String(Math.round(y))];
        break;
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
        const action = String(cmd.payload?.action || "");
        const x = Math.round(Number(cmd.payload.x));
        const y = Math.round(Number(cmd.payload.y));
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          throw new Error("touch requires numeric x,y");
        }
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
          args = [...base, "motionevent", "DOWN", String(x), String(y)];
        } else if (action === "move") {
          if (!gesture.active) return;
          if (gesture.lastX === x && gesture.lastY === y) return;
          gesture.lastX = x;
          gesture.lastY = y;
          this.touchGestures.set(effective, gesture);
          args = [...base, "motionevent", "MOVE", String(x), String(y)];
        } else if (action === "up") {
          gesture.active = false;
          this.touchGestures.set(effective, gesture);
          args = [...base, "motionevent", "UP", String(x), String(y)];
        } else {
          throw new Error(`Unknown touch action: ${action}`);
        }
        break;
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
    const timeoutMs = cmd.type === "touch" ? 2500 : 8000;
    const opts = { timeout: timeoutMs, windowsHide: true };

    try {
      const { stderr } = await execFileAsync(adbPath, args, opts as any);
      if (stderr) this.logger.warn(`[INPUT] stderr: ${stderr}`);
    } catch (err: any) {
      if (cmd.type === "touch") {
        await this.execTouchFallback(
          adbPath,
          effective,
          cmd,
          base,
          opts as any,
        );
        return;
      }
      throw err;
    }
  }

  /** Fallback when `input motionevent` is unavailable on older Android builds. */
  private async execTouchFallback(
    adbPath: string,
    effective: string,
    cmd: AdbInputCommand,
    base: string[],
    opts: { timeout: number; windowsHide: boolean },
  ): Promise<void> {
    const action = String(cmd.payload?.action || "");
    const x = Math.round(Number(cmd.payload.x));
    const y = Math.round(Number(cmd.payload.y));
    const gesture = this.touchGestures.get(effective);

    if (action === "down") {
      const args = [...base, "swipe", String(x), String(y), String(x), String(y), "1"];
      await execFileAsync(adbPath, args, opts);
      return;
    }

    if (action === "move" && gesture?.active) {
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
      await execFileAsync(adbPath, args, opts);
      return;
    }

    if (action === "up") {
      const args = [...base, "swipe", String(x), String(y), String(x), String(y), "1"];
      await execFileAsync(adbPath, args, opts);
    }
  }
}
