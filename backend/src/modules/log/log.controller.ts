// backend/src/modules/log/log.controller.ts
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { LogService } from './log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin-logs')
@UseGuards(JwtAuthGuard)
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get()
  async findAll(@Query('type') type?: string) {
    return this.logService.findAll(type);
  }

  /**
   * Export all logs to Google Sheets, then remove them from the database.
   * Requires GOOGLE_SHEETS_SPREADSHEET_ID + service account credentials.
   */
  @Post('archive-and-clear')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async archiveAndClear(
    @Body() body: { confirm?: boolean },
    @CurrentUser() user: { username?: string },
  ) {
    if (body?.confirm !== true) {
      throw new BadRequestException('confirm must be true');
    }
    const triggeredBy = user?.username || 'unknown';
    return this.logService.archiveAllLogsToSheetsAndClear(triggeredBy);
  }
}
