import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from './device.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.schema';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
    constructor(private readonly devicesService: DevicesService) { }

    @Get()
    async findAll(): Promise<Device[]> {
        return this.devicesService.findAll();
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
    async create(@Body() device: any): Promise<Device> {
        return this.devicesService.create(device);
    }
}
