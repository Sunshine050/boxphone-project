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
  type: "tap" | "swipe" | "key" | "text";
  /** tap: {x, y}  swipe: {x1,y1,x2,y2,duration?}  key: {keycode}  text: {value} */
  payload: Record<string, any>;
}

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
    const effective = await this.resolveSerialForScreencap(serial);
    const adbPath = this.configService.get<string>("ADB_PATH") || "adb";
    const base = ["-s", effective, "shell", "input"];
    let args: string[];

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
          String(duration),
        ];
        break;
      }
      case "key": {
        // keycode: number (KEYCODE_BACK=4, KEYCODE_HOME=3, KEYCODE_APP_SWITCH=187)
        args = [...base, "keyevent", String(cmd.payload.keycode)];
        break;
      }
      case "text": {
        // escape spaces with %s
        const escaped = String(cmd.payload.value).replace(/ /g, "%s");
        args = [...base, "text", escaped];
        break;
      }
      default:
        throw new Error(`Unknown input type: ${(cmd as any).type}`);
    }

    this.logger.debug(`[INPUT] adb ${args.join(" ")}`);
    const opts = { timeout: 8000, windowsHide: true };
    const { stderr } = await execFileAsync(adbPath, args, opts as any);
    if (stderr) this.logger.warn(`[INPUT] stderr: ${stderr}`);
  }
}
