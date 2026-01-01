import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SessionsService } from "./sessions.service";
import { SessionsController } from "./sessions.controller";
import { Session, SessionSchema } from "./session.schema";
import { SessionMoveLog, SessionMoveLogSchema } from "./session-move-log.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: SessionMoveLog.name, schema: SessionMoveLogSchema },
    ]),
  ],
  providers: [SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}

