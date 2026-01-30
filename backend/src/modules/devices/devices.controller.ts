import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { DevicesService } from './devices.service';
import { Device } from './device.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { XiaoweiService } from './xiaowei.service';
import { XiaoweiWebSocketService } from './xiaowei-websocket.service';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
    private readonly logger = new Logger(DevicesController.name);

    constructor(
        private readonly devicesService: DevicesService,
        private readonly xiaoweiService: XiaoweiService,
        private readonly xiaoweiWsService: XiaoweiWebSocketService,
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
                        // อัปเดต device ที่มีอยู่ - ใช้ id จาก device
                        const deviceId = (device as any)._id?.toString() || (device as any).id?.toString();
                        if (deviceId) {
                            await this.devicesService.update(deviceId, {
                                name,
                                model,
                                status,
                                metadata: xiaoweiDevice,
                                last_connected_at: new Date(),
                            });
                            this.logger.log(`[SYNC] Updated device: ${name} (${serial})`);
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
            
            this.logger.debug(`[SCREENSHOT] Fetching screenshot from Xiaowei for serial: ${serialToUse}`);
            // ลอง WebSocket ก่อน, ถ้าไม่ได้ลอง HTTP
            let screenshot: Buffer;
            try {
                if (this.xiaoweiWsService.isConnected()) {
                    screenshot = await this.xiaoweiWsService.getScreenshot(serialToUse);
                    this.logger.debug(`[SCREENSHOT] Fetched via WebSocket`);
                } else {
                    throw new Error('WebSocket not connected');
                }
            } catch (wsError: any) {
                this.logger.warn(`[SCREENSHOT] WebSocket failed, trying HTTP: ${wsError.message}`);
                screenshot = await this.xiaoweiService.getScreenshot(serialToUse);
                this.logger.debug(`[SCREENSHOT] Fetched via HTTP`);
            }
            
            this.logger.debug(`[SCREENSHOT] Screenshot received - Size: ${screenshot.length} bytes`);
            
            res.setHeader('Content-Type', 'image/png');
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
     * ดึงหน้าจอจากเสี่ยวเหว๋ยตาม serial number
     * GET /devices/screenshot?serial=xxx
     */
    @Get('screenshot')
    async getScreenshotBySerial(@Query('serial') serial: string, @Res() res: Response) {
        try {
            if (!serial) {
                return res.status(400).json({ message: 'Serial number is required' });
            }

            this.logger.debug(`[SCREENSHOT] Request for serial: ${serial}`);
            // ลอง WebSocket ก่อน, ถ้าไม่ได้ลอง HTTP
            let screenshot: Buffer;
            try {
                if (this.xiaoweiWsService.isConnected()) {
                    screenshot = await this.xiaoweiWsService.getScreenshot(serial);
                    this.logger.debug(`[SCREENSHOT] Fetched via WebSocket`);
                } else {
                    throw new Error('WebSocket not connected');
                }
            } catch (wsError: any) {
                this.logger.warn(`[SCREENSHOT] WebSocket failed, trying HTTP: ${wsError.message}`);
                screenshot = await this.xiaoweiService.getScreenshot(serial);
                this.logger.debug(`[SCREENSHOT] Fetched via HTTP`);
            }
            
            this.logger.debug(`[SCREENSHOT] Screenshot received - Size: ${screenshot.length} bytes`);
            
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Content-Length', screenshot.length.toString());
            res.send(screenshot);
        } catch (error: any) {
            this.logger.error(`[SCREENSHOT] Failed to get screenshot for serial ${serial}: ${error.message}`);
            this.logger.error(`[SCREENSHOT] Error stack: ${error.stack}`);
            res.status(500).json({ 
                message: error.message || 'Failed to fetch screenshot',
                error: error.message 
            });
        }
    }

}
