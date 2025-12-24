import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device, DeviceDocument, DeviceStatus } from './device.schema';

@Injectable()
export class DevicesService {
    constructor(
        @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    ) { }

    async findAll(): Promise<Device[]> {
        return this.deviceModel.find().sort({ last_connected_at: -1 }).exec();
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

    async create(createDeviceDto: any): Promise<Device> {
        const createdDevice = new this.deviceModel(createDeviceDto);
        return createdDevice.save();
    }
}
