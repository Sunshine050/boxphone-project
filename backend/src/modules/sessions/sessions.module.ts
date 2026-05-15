import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SessionsService } from "./sessions.service";
import { SessionsController } from "./sessions.controller";
import { Session, SessionSchema } from "./session.schema";
import { SessionMoveLog, SessionMoveLogSchema } from "./session-move-log.schema";
import { User, UserSchema } from "../users/user.schema";
import { Device, DeviceSchema } from "../devices/device.schema";
import { ScheduleModule } from "@nestjs/schedule";
import { DevicesModule } from "../devices/devices.module";

@Module({
  imports: [
    DevicesModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: SessionMoveLog.name, schema: SessionMoveLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema }
    ]),
  ],
  providers: [SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule { }

