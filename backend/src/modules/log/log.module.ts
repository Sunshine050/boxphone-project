import { Module, Global } from '@nestjs/common'; 
import { MongooseModule } from '@nestjs/mongoose';
import { LogController } from './log.controller';
import { LogService } from './log.service';
import { AdminLog, AdminLogSchema } from './admin-log.schema';

@Global() 
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AdminLog.name, schema: AdminLogSchema }]),
  ],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService], 
})
export class LogModule {}