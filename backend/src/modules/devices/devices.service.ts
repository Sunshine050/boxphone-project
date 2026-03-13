import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Device, DeviceDocument, DeviceStatus } from './device.schema';
import { XiaoweiService } from './xiaowei.service';
import { XiaoweiWebSocketService } from './xiaowei-websocket.service';

const execAsync = promisify(exec);

@Injectable()
export class DevicesService {
    private readonly logger = new Logger(DevicesService.name);

    constructor(
        @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
        private readonly configService: ConfigService,
        private readonly xiaoweiService: XiaoweiService,
        private readonly xiaoweiWsService: XiaoweiWebSocketService,
    ) { }

    async findAll(): Promise<Device[]> {
        const devices = await this.deviceModel.find().sort({ last_connected_at: -1 }).exec();

        // ==========================================
        // 🔴 MOCK DEVICE 20 (สำหรับทดสอบ 20 จอ) 🔴
        // ลบโค้ดบล็อกข้างล่างนี้ออกได้เลยครับหลังจากแก้ Boxphone จริงเสร็จ
        devices.push({
            _id: "mock_device_id_20_0000",
            serial_number: "3875cf71253f",
            name: "Device 3875cf71253f...",
            model: "SM-N960F",
            status: DeviceStatus.AVAILABLE,
            last_connected_at: new Date()
        } as any);
        // ==========================================

        return devices;
    }

    async register(deviceId: string, info: any): Promise<Device> {
        return this.deviceModel.findOneAndUpdate(
            { serial_number: deviceId },
            {
                serial_number: deviceId,
                name: info.model || deviceId,
                model: info.model,
                sdk_version: info.sdk,
                status: DeviceStatus.AVAILABLE,
                last_connected_at: new Date(),
                metadata: info
            },
            { upsert: true, new: true }
        ).exec();
    }

    async updateStatus(deviceId: string, status: DeviceStatus): Promise<void> {
        await this.deviceModel.updateOne(
            { serial_number: deviceId },
            { status }
        ).exec();
    }

    async findOne(id: string): Promise<Device | null> {
        // ==========================================
        // 🔴 MOCK DEVICE 20 (สำหรับทดสอบ 20 จอ) 🔴
        // ลบโค้ดบล็อกนี้ออกพร้อมกับข้างบน
        if (id === "mock_device_id_20_0000") {
            return {
                _id: "mock_device_id_20_0000",
                serial_number: "3875cf71253f",
                name: "Device 3875cf71253f...",
                model: "SM-N960F",
                status: DeviceStatus.AVAILABLE,
                last_connected_at: new Date()
            } as any;
        }
        // ==========================================

        return this.deviceModel.findById(id).exec();
    }

    async findBySerialNumber(serialNumber: string): Promise<Device | null> {
        return this.deviceModel.findOne({ serial_number: serialNumber }).exec();
    }

    async update(id: string, updateDeviceDto: any): Promise<Device | null> {
        return this.deviceModel.findByIdAndUpdate(id, updateDeviceDto, { new: true }).exec();
    }

    async remove(id: string): Promise<void> {
        await this.deviceModel.findByIdAndDelete(id).exec();
    }

    async create(createDeviceDto: any): Promise<Device> {
        const createdDevice = new this.deviceModel({
            ...createDeviceDto,
            status: DeviceStatus.AVAILABLE,
            last_connected_at: new Date(),
        });

        return createdDevice.save();
    }

    async syncFromXiaowei(adminUsername: string): Promise<any> {
        this.logger.log(`[SYNC] Admin ${adminUsername} syncing devices from Xiaowei`);

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
        for (const xiaoweiDevice of xiaoweiDevices) {
            try {
                const serial = xiaoweiDevice.serial || xiaoweiDevice.onlySerial;
                const name = xiaoweiDevice.name || xiaoweiDevice.model || `Device ${serial}`;
                const model = xiaoweiDevice.model || 'Unknown';
                const status = xiaoweiDevice.status === 'online' ? 'AVAILABLE' : 'OFFLINE';

                let device = await this.findBySerialNumber(serial);

                if (!device) {
                    device = await this.create({
                        name,
                        serial_number: serial,
                        model,
                        status,
                        metadata: xiaoweiDevice,
                    });
                    this.logger.log(`[SYNC] Created new device: ${name} (${serial})`);
                } else {
                    const deviceId = (device as any)._id?.toString() || (device as any).id?.toString();
                    if (deviceId) {
                        await this.update(deviceId, {
                            name,
                            model,
                            status,
                            metadata: xiaoweiDevice,
                            last_connected_at: new Date(),
                        });
                        this.logger.log(`[SYNC] Updated device: ${name} (${serial})`);
                    }
                }

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
    }

}
