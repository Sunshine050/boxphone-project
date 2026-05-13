import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device, DeviceSchema } from './device.schema';
import { XiaoweiService } from './xiaowei.service';
import { XiaoweiWebSocketService } from './xiaowei-websocket.service';
import { AdbScreenshotService } from './adb-screenshot.service';
import { ScrcpyService } from './scrcpy.service';
import { User, UserSchema } from '../users/user.schema';
import { DiscordModule } from '../discord/discord.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }]),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        DiscordModule,
    ],
    controllers: [DevicesController],
    providers: [DevicesService, XiaoweiService, XiaoweiWebSocketService, AdbScreenshotService, ScrcpyService],
    exports: [DevicesService, XiaoweiService, XiaoweiWebSocketService, AdbScreenshotService, ScrcpyService],
})
export class DevicesModule { }
