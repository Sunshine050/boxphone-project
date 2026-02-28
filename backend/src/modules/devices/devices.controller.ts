import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { DevicesService } from './devices.service';
import { Device } from './device.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { XiaoweiWebSocketService } from './xiaowei-websocket.service';
import { AdbScreenshotService, AdbInputCommand } from './adb-screenshot.service';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
    private readonly logger = new Logger(DevicesController.name);

    constructor(
        private readonly devicesService: DevicesService,
        private readonly xiaoweiWsService: XiaoweiWebSocketService,
        private readonly adbScreenshotService: AdbScreenshotService,
    ) { }

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
        return this.devicesService.syncFromXiaowei(currentUser?.username || 'unknown');
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
            const screenshot = await this.adbScreenshotService.fetchScreenshotForSerial(serial);
            const isPng = screenshot.length >= 4 && screenshot[0] === 0x89 && screenshot[1] === 0x50 && screenshot[2] === 0x4e && screenshot[3] === 0x47;
            this.logger.log(`[SCREENSHOT] OK for ${serial}: ${screenshot.length} bytes (${isPng ? 'PNG' : 'JPEG'})`);
            res.setHeader('Content-Type', isPng ? 'image/png' : 'image/jpeg');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Content-Length', screenshot.length.toString());
            res.send(screenshot);
        } catch (error: any) {
            this.logger.error(`[SCREENSHOT] Failed to get screenshot for serial ${serial}: ${error.message}`);
            const message = error.message || 'Failed to fetch screenshot.';
            res.status(500).json({ message, error: error.message });
        }
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

            const serialToUse = device.serial_number || (device as any).onlySerial || device.serial_number;

            this.logger.debug(`[SCREENSHOT] Fetching screenshot for serial: ${serialToUse}`);
            const screenshot = await this.adbScreenshotService.fetchScreenshotForSerial(serialToUse);
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

    /**
     * ส่งคำสั่ง input (tap, swipe, key, text) ไปยังเครื่อง Android ผ่าน ADB
     * POST /devices/:id/input
     * Body: { type: 'tap'|'swipe'|'key'|'text', payload: {...} }
     * ทุก logged-in user เข้าถึงได้ (ไม่ต้อง admin) — ต้องมี session ที่ valid ก่อน
     */
    @Post(':id/input')
    async sendInput(
        @Param('id') id: string,
        @Body() body: AdbInputCommand,
        @Res() res: Response,
    ) {
        try {
            const device = await this.devicesService.findOne(id);
            if (!device) {
                return res.status(404).json({ message: 'Device not found' });
            }
            const serial = device.serial_number;
            if (!serial) {
                return res.status(400).json({ message: 'Device has no serial number' });
            }
            await this.adbScreenshotService.sendInput(serial, body);
            // ล้าง cache ทันทีหลัง input เพื่อให้ screenshot ถัดไปดึงภาพใหม่ (ลด delay)
            this.adbScreenshotService.clearCacheForSerial(serial);
            return res.status(200).json({ ok: true });
        } catch (error: any) {
            this.logger.error(`[INPUT] Failed for device ${id}: ${error.message}`);
            return res.status(500).json({ message: error.message });
        }
    }

}
