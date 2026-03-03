import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get('me')
  async getMyNotifications(@CurrentUser() user: any) {
    const userId = user.userId || user.id;
    return this.notificationService.getMyNotifications(userId);
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
}