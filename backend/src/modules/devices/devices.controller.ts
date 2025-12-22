import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from './device.entity';

@Controller('devices')
export class DevicesController {
    constructor(private readonly devicesService: DevicesService) { }

    @Get()
    findAll(): Promise<Device[]> {
        return this.devicesService.findAll();
    }

    @Post()
    create(@Body() device: Partial<Device>): Promise<Device> {
        return this.devicesService.create(device);
    }
}
