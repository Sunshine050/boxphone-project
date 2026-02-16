// backend/src/modules/log/log.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LogService } from './log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // ปรับตาม path ของคุณ

@Controller('admin-logs')
@UseGuards(JwtAuthGuard) 
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get()
  async findAll(@Query('type') type?: string) {
    return this.logService.findAll(type);
  }
}