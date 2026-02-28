import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export const PLACEHOLDER_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);

const SCREENSHOT_CACHE_TTL_MS = 8000;
const SCREENSHOT_MAX_CONCURRENT = 2;

@Injectable()
export class AdbScreenshotService {
    private readonly logger = new Logger(AdbScreenshotService.name);
    private readonly screenshotCache = new Map<string, { buffer: Buffer; at: number }>();
    private screenshotRunning = 0;
    private readonly screenshotQueue: Array<() => void> = [];

    constructor(private readonly configService: ConfigService) { }

    private async acquireScreenshotSlot(): Promise<void> {
        const max = this.configService.get<number>('SCREENSHOT_MAX_CONCURRENT') ?? SCREENSHOT_MAX_CONCURRENT;
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
        const max = this.configService.get<number>('SCREENSHOT_MAX_CONCURRENT') ?? SCREENSHOT_MAX_CONCURRENT;
        this.screenshotRunning--;
        if (this.screenshotQueue.length > 0 && this.screenshotRunning < max) {
            const next = this.screenshotQueue.shift()!;
            next();
        }
    }

    /**
     * ดึงหน้าจอผ่าน ADB พร้อมแคชภาพแบบ TTL และจำกัด concurrent
     */
    async fetchScreenshotForSerial(serial: string): Promise<Buffer> {
        const ttlMs = this.configService.get<number>('SCREENSHOT_CACHE_TTL_MS') ?? SCREENSHOT_CACHE_TTL_MS;
        const cached = this.screenshotCache.get(serial);
        if (cached && Date.now() - cached.at < ttlMs) {
            this.logger.debug(`[SCREENSHOT] Cache hit for ${serial}`);
            return cached.buffer;
        }
        await this.acquireScreenshotSlot();
        try {
            const screenshot = await this.screenshotViaAdb(serial);
            if (screenshot && screenshot.length > 0) {
                this.screenshotCache.set(serial, { buffer: screenshot, at: Date.now() });
                this.logger.log(`[SCREENSHOT] Fetched via ADB, ${screenshot.length} bytes`);
                return screenshot;
            }
        } catch (e: any) {
            this.logger.warn(`[SCREENSHOT] ADB failed for ${serial}: ${e.message}`);
        } finally {
            this.releaseScreenshotSlot();
        }
        this.logger.warn(`[SCREENSHOT] No screenshot for ${serial}, returning placeholder`);
        return PLACEHOLDER_PNG;
    }

    /** ดึงหน้าจอผ่าน ADB แบบ async — ไม่บล็อก event loop */
    private async screenshotViaAdb(serial: string): Promise<Buffer> {
        const adbPath = this.configService.get<string>('ADB_PATH') || 'adb';
        const opts = { encoding: 'buffer' as const, timeout: 15000, maxBuffer: 10 * 1024 * 1024 };
        try {
            this.logger.debug(`[SCREENSHOT] ADB exec-out screencap -p for ${serial} (adb: ${adbPath})`);
            const { stdout: out } = await execFileAsync(adbPath, ['-s', serial, 'exec-out', 'screencap', '-p'], opts);
            if (Buffer.isBuffer(out) && out.length > 0) {
                this.logger.log(`[SCREENSHOT] ADB exec-out OK - ${out.length} bytes`);
                return out;
            }
        } catch (e1: any) {
            this.logger.debug(`[SCREENSHOT] exec-out failed: ${e1.message}, trying shell screencap -p`);
            try {
                const { stdout: out } = await execAsync(`${adbPath} -s ${serial} shell screencap -p`, { encoding: 'buffer', timeout: 15000, maxBuffer: 10 * 1024 * 1024 });
                if (Buffer.isBuffer(out) && out.length > 0) {
                    this.logger.log(`[SCREENSHOT] ADB shell screencap OK - ${out.length} bytes`);
                    return out;
                }
            } catch (e2: any) {
                this.logger.warn(`[SCREENSHOT] ADB shell failed: ${e2.message}`);
            }
            throw new Error(`ADB screencap failed: ${e1.message}`);
        }
        throw new Error('ADB screencap returned empty');
    }
}
