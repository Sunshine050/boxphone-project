import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get('me')
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user.userId || user.id;
    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit || '10'), 10) || 10));
    return this.notificationService.getMyNotifications(userId, pageNum, limitNum);
  }

  @Post(':id/read')
  async markOne(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    const userId = user.userId || user.id;
    return this.notificationService.markAsRead(id, userId);
  }

  @Post('read-all')
  async markAll(@CurrentUser() user: any) {
    const userId = user.userId || user.id;
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  async deleteOne(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user.userId || user.id;
    const ok = await this.notificationService.deleteNotification(id, userId);
    return { success: ok };
  }

  @Delete('me/clear')
  async clearAll(@CurrentUser() user: any) {
    const userId = user.userId || user.id;
    return this.notificationService.clearAll(userId);
  }
}