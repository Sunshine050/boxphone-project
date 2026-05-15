import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogController } from './log.controller';
import { LogService } from './log.service';
import { AdminLog, AdminLogSchema } from './admin-log.schema';
import { RolesGuard } from '../auth/guards/roles.guard';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AdminLog.name, schema: AdminLogSchema }]),
  ],
  controllers: [LogController],
  providers: [LogService, RolesGuard],
  exports: [LogService],
})
export class LogModule {}