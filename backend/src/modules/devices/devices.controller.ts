import { Controller, Get, Post, Body } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from './device.schema';

@Controller('devices')
export class DevicesController {
    constructor(private readonly devicesService: DevicesService) { }

    @Get()
    async findAll(): Promise<Device[]> {
        return this.devicesService.findAll();
    }

    @Post()
    async create(@Body() device: any): Promise<Device> {
        return this.devicesService.create(device);
    }
}
