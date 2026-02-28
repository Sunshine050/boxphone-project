import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device, DeviceSchema } from './device.schema';
import { XiaoweiService } from './xiaowei.service';
import { XiaoweiWebSocketService } from './xiaowei-websocket.service';
import { AdbScreenshotService } from './adb-screenshot.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }]),
    ],
    controllers: [DevicesController],
    providers: [DevicesService, XiaoweiService, XiaoweiWebSocketService, AdbScreenshotService],
    exports: [DevicesService, XiaoweiService, XiaoweiWebSocketService, AdbScreenshotService],
})
export class DevicesModule { }
