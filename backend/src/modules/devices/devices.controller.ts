import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from './device.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
    private readonly logger = new Logger(DevicesController.name);

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
}
