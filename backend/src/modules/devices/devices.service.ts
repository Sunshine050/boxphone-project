import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device, DeviceDocument } from './device.schema';

@Injectable()
export class DevicesService {
    constructor(
        @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    ) { }

    async findAll(): Promise<Device[]> {
        return this.deviceModel.find().exec();
    }

    async create(createDeviceDto: any): Promise<Device> {
        const createdDevice = new this.deviceModel(createDeviceDto);
        return createdDevice.save();
    }
}
