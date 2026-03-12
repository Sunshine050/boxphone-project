import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger, Res, Query, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
import { DevicesService } from './devices.service';
import { Device } from './device.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { XiaoweiService } from './xiaowei.service';
import { XiaoweiWebSocketService } from './xiaowei-websocket.service';

/** Placeholder PNG (1x1 transparent) เมื่อดึงหน้าจาจาก HTTP/ADB ไม่ได้ — ให้ frontend ได้ 200 + image แทน error */
const PLACEHOLDER_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);

/** Cache ภาพต่อ serial (ลดการเรียก ADB ซ้ำ) */
const SCREENSHOT_CACHE_TTL_MS = 8000;
const SCREENSHOT_MAX_CONCURRENT = 2;

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
    private readonly logger = new Logger(DevicesController.name);
    private readonly screenshotCache = new Map<string, { buffer: Buffer; at: number }>();
    private screenshotRunning = 0;
    private readonly screenshotQueue: Array<() => void> = [];

    constructor(
        private readonly devicesService: DevicesService,
        private readonly xiaoweiService: XiaoweiService,
        private readonly xiaoweiWsService: XiaoweiWebSocketService,
        private readonly configService: ConfigService,
    ) { }

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

    @Get()
    async findAll(): Promise<Device[]> {
        return this.devicesService.findAll();
    }

    /**
     * ดึงรายการอุปกรณ์จากเสี่ยวเหว๋ยและ sync กับ database
     * GET /devices/sync-from-xiaowei
     * ⚠️ ต้องอยู่ก่อน @Get(':id') เพื่อไม่ให้ route conflict
     */
    @Get('sync-from-xiaowei')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async syncFromXiaowei(@CurrentUser() currentUser: any) {
        try {
            this.logger.log(`[SYNC] Admin ${currentUser?.username || 'unknown'} syncing devices from Xiaowei`);
            
            // ดึงรายการอุปกรณ์จากเสี่ยวเหว๋ย (ลอง WebSocket ก่อน, ถ้าไม่ได้ลอง HTTP)
            let xiaoweiDevices: any[] = [];
            try {
                if (this.xiaoweiWsService.isConnected()) {
                    xiaoweiDevices = await this.xiaoweiWsService.getDeviceList();
                    this.logger.log(`[SYNC] Fetched ${xiaoweiDevices.length} devices via WebSocket`);
                } else {
                    throw new Error('WebSocket not connected');
                }
            } catch (wsError: any) {
                this.logger.warn(`[SYNC] WebSocket failed, trying HTTP: ${wsError.message}`);
                try {
                    xiaoweiDevices = await this.xiaoweiService.getDeviceList();
                    this.logger.log(`[SYNC] Fetched ${xiaoweiDevices.length} devices via HTTP`);
                } catch (httpError: any) {
                    throw new Error(`Both WebSocket and HTTP failed: ${httpError.message}`);
                }
            }
            this.logger.log(`[SYNC] Found ${xiaoweiDevices.length} devices from Xiaowei`);

            // Fallback: ถ้าเสี่ยวเหว๋ยคืน 0 เครื่อง แต่เครื่องต่อ USB อยู่ — ดึงจาก ADB
            if (xiaoweiDevices.length === 0) {
                try {
                    const adbPath = this.configService.get<string>('ADB_PATH') || 'adb';
                    const { stdout: adbOut } = await execAsync(`${adbPath} devices`, { encoding: 'utf8', timeout: 5000 });
                    const lines = adbOut.split(/\r?\n/).filter((l) => l.trim());
                    const adbList: { serial: string; status: string }[] = [];
                    for (const line of lines) {
                        if (line.startsWith('List of devices')) continue;
                        const parts = line.split(/\s+/).filter(Boolean);
                        if (parts.length >= 2 && parts[1] === 'device') {
                            adbList.push({ serial: parts[0], status: 'online' });
                        }
                    }
                    if (adbList.length > 0) {
                        xiaoweiDevices = adbList.map((d) => ({ serial: d.serial, onlySerial: d.serial, status: d.status, name: `Device ${d.serial}`, model: 'ADB' }));
                        this.logger.log(`[SYNC] Fallback: got ${xiaoweiDevices.length} devices from ADB`);
                    }
                } catch (adbErr: any) {
                    this.logger.warn(`[SYNC] ADB fallback failed: ${adbErr.message}`);
                }
            }

            const syncedDevices = [];
            
            // Sync แต่ละอุปกรณ์
            for (const xiaoweiDevice of xiaoweiDevices) {
                try {
                    // ใช้ serial หรือ onlySerial ตามเอกสารเสี่ยวเหว๋ย
                    const serial = xiaoweiDevice.serial || xiaoweiDevice.onlySerial;
                    const name = xiaoweiDevice.name || xiaoweiDevice.model || `Device ${serial}`;
                    const model = xiaoweiDevice.model || 'Unknown';
                    const status = xiaoweiDevice.status === 'online' ? 'AVAILABLE' : 'OFFLINE';

                    // หาหรือสร้าง device ใน database
                    let device = await this.devicesService.findBySerialNumber(serial);
                    
                    if (!device) {
                        // สร้าง device ใหม่
                        device = await this.devicesService.create({
                            name,
                            serial_number: serial,
                            model,
                            status,
                            metadata: xiaoweiDevice,
                        });
                        this.logger.log(`[SYNC] Created new device: ${name} (${serial})`);
                    } else {
                        // อัปเดต device ที่มีอยู่ — ไม่ทับสถานะ แจ้งซ่อม/ชำรุด
                        const deviceId = (device as any)._id?.toString() || (device as any).id?.toString();
                        const currentStatus = (device as any).status;
                        const keepManualStatus = currentStatus === 'UNDER_REPAIR' || currentStatus === 'DAMAGED';
                        if (deviceId) {
                            const updatePayload: any = {
                                name,
                                model,
                                metadata: xiaoweiDevice,
                                last_connected_at: new Date(),
                            };
                            if (!keepManualStatus) updatePayload.status = status;
                            await this.devicesService.update(deviceId, updatePayload);
                            this.logger.log(`[SYNC] Updated device: ${name} (${serial})${keepManualStatus ? ' [status kept]' : ''}`);
                        }
                    }

                    // ใช้ id จาก device object
                    const deviceId = (device as any)._id?.toString() || (device as any).id?.toString();
                    syncedDevices.push({
                        id: deviceId,
                        name: device.name,
                        serial_number: device.serial_number,
                        status: device.status,
                    });
                } catch (error: any) {
                    this.logger.error(`[SYNC] Failed to sync device ${xiaoweiDevice.serial || xiaoweiDevice.onlySerial}: ${error.message}`);
                }
            }

            return {
                message: `Synced ${syncedDevices.length} devices from Xiaowei`,
                total: xiaoweiDevices.length,
                synced: syncedDevices.length,
                devices: syncedDevices,
            };
        } catch (error: any) {
            this.logger.error(`[SYNC] Failed to sync devices from Xiaowei: ${error.message}`);
            throw error;
        }
    }

    /**
     * ดึงหน้าจอจาก serial (ต้องอยู่ก่อน @Get(':id') เพื่อไม่ให้ "screenshot" ถูกจับเป็น :id)
     * GET /devices/screenshot?serial=xxx
     */
    @Get('screenshot')
    async getScreenshotBySerial(@Query('serial') serial: string, @Res() res: Response) {
        try {
            if (!serial) {
                return res.status(400).json({ message: 'Serial number is required' });
            }
            this.logger.log(`[SCREENSHOT] Request for serial: ${serial}`);
            const screenshot = await this.fetchScreenshotForSerial(serial);
            const isPng = screenshot.length >= 4 && screenshot[0] === 0x89 && screenshot[1] === 0x50 && screenshot[2] === 0x4e && screenshot[3] === 0x47;
            this.logger.log(`[SCREENSHOT] OK for ${serial}: ${screenshot.length} bytes (${isPng ? 'PNG' : 'JPEG'})`);
            res.setHeader('Content-Type', isPng ? 'image/png' : 'image/jpeg');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Content-Length', screenshot.length.toString());
            res.send(screenshot);
        } catch (error: any) {
            this.logger.error(`[SCREENSHOT] Failed to get screenshot for serial ${serial}: ${error.message}`);
            const message =
                error.message ||
                'Failed to fetch screenshot. Check: 1) XIAOWEI_WS_URL in backend .env, 2) Xiaowei app open + API on, 3) ADB if using USB.';
            res.status(500).json({ message, error: error.message });
        }
    }

    /**
     * ดึง screenshot: cache (TTL) + จำกัด concurrent ADB เพื่อไม่ให้ช้า
     */
    private async fetchScreenshotForSerial(serial: string): Promise<Buffer> {
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

    /** ดึงหน้าจอผ่าน ADB แบบ async — ไม่บล็อก event loop จึงไม่ทำให้หน้า users/devices/logs ช้า */
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

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Device> {
        return this.devicesService.findOne(id);
    }

   
    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async update(@Param('id') id: string, @Body() updateDeviceDto: any): Promise<Device> {
        return this.devicesService.update(id, updateDeviceDto);
    }

    /**
     * Mark device: แจ้งซ่อม (UNDER_REPAIR) หรือ ชำรุด (DAMAGED)
     * PATCH /devices/:id/mark-status
     */
    @Patch(':id/mark-status')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async markStatus(
        @Param('id') id: string,
        @Body() body: { status: 'UNDER_REPAIR' | 'DAMAGED' | 'AVAILABLE' },
        @CurrentUser() currentUser: any,
    ) {
        const status = body?.status;
        if (!status || !['UNDER_REPAIR', 'DAMAGED', 'AVAILABLE'].includes(status)) {
            throw new BadRequestException('status must be one of: UNDER_REPAIR, DAMAGED, AVAILABLE');
        }
        this.logger.log(`[MARK_STATUS] Admin: ${currentUser?.username || 'unknown'} set device ${id} → ${status}`);
        const device = await this.devicesService.update(id, { status });
        return { message: 'Device status updated', device };
    }

    
    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async remove(@Param('id') id: string) {
        await this.devicesService.remove(id);
        return { message: 'Device deleted successfully' };
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async create(@Body() device: any, @CurrentUser() currentUser: any): Promise<Device> {
        this.logger.log(`[CREATE_DEVICE] Admin: ${currentUser?.username || 'unknown'} creating device: ${device.name || 'unknown'}, Serial: ${device.serial_number || 'unknown'}`);
        try {
            const createdDevice = await this.devicesService.create(device);
            const deviceId = (createdDevice as any)._id.toString();
            this.logger.log(`[CREATE_DEVICE] ✅ Success - Device ID: ${deviceId}, Name: ${createdDevice.name}, Serial: ${createdDevice.serial_number}`);
            return createdDevice;
        } catch (error) {
            this.logger.error(`[CREATE_DEVICE] ❌ Failed - Name: ${device.name}, Serial: ${device.serial_number}, Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * ดึงหน้าจอเป็น JSON { image: "data:image/jpeg;base64,..." } สำหรับ <img src={image} />
     * ส่ง device.preview ไปเสี่ยวเหว๋ยแล้วรอ binary กลับมา
     * GET /devices/:id/preview
     */
    @Get(':id/preview')
    async getPreview(@Param('id') id: string) {
        try {
            const device = await this.devicesService.findOne(id);
            if (!device) {
                return { image: null, message: 'Device not found' };
            }
            const serial = device.serial_number || (device as any).onlySerial;
            if (!serial) {
                return { image: null, message: 'Device has no serial' };
            }
            let image: string | null = null;
            if (this.xiaoweiWsService.isConnected()) {
                try {
                    const buffer = await this.xiaoweiWsService.getScreenshot(serial);
                    if (buffer && buffer.length > 0) {
                        const base64 = buffer.toString('base64');
                        const isPng = buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50;
                        image = `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${base64}`;
                    }
                } catch (e) {
                    image = this.xiaoweiWsService.getLastPreviewBase64(serial);
                }
            }
            if (!image) {
                image = this.xiaoweiWsService.getLastPreviewBase64(serial);
            }
            return { image };
        } catch (error: any) {
            this.logger.error(`[PREVIEW] Failed for device ${id}: ${error.message}`);
            return { image: null, message: error.message };
        }
    }

    /**
     * ดึงหน้าจอจากเสี่ยวเหว๋ยตาม device ID
     * GET /devices/:id/screenshot
     */
    @Get(':id/screenshot')
    async getScreenshot(@Param('id') id: string, @Res() res: Response) {
        try {
            this.logger.debug(`[SCREENSHOT] Request for device ID: ${id}`);
            
            const device = await this.devicesService.findOne(id);
            if (!device) {
                this.logger.warn(`[SCREENSHOT] Device not found: ${id}`);
                return res.status(404).json({ message: 'Device not found' });
            }

            this.logger.debug(`[SCREENSHOT] Device found - Serial: ${device.serial_number}, Name: ${device.name}`);
            
            // ใช้ serial_number หรือ onlySerial ตามเอกสารเสี่ยวเหว๋ย
            const serialToUse = device.serial_number || (device as any).onlySerial || device.serial_number;
            
            this.logger.debug(`[SCREENSHOT] Fetching screenshot for serial: ${serialToUse}`);
            const screenshot = await this.fetchScreenshotForSerial(serialToUse);
            const isPng = screenshot.length >= 4 && screenshot[0] === 0x89 && screenshot[1] === 0x50 && screenshot[2] === 0x4e && screenshot[3] === 0x47;
            res.setHeader('Content-Type', isPng ? 'image/png' : 'image/jpeg');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Content-Length', screenshot.length.toString());
            res.send(screenshot);
        } catch (error: any) {
            this.logger.error(`[SCREENSHOT] Failed to get screenshot for device ${id}: ${error.message}`);
            this.logger.error(`[SCREENSHOT] Error stack: ${error.stack}`);
            res.status(500).json({ 
                message: error.message || 'Failed to fetch screenshot',
                error: error.message 
            });
        }
    }

}
