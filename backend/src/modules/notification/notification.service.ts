import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private readonly model: Model<Notification>,
    private readonly gateway: NotificationGateway,
  ) { }

  async createAndSend(userId: string, title: string, message: string, type: string = 'INFO') {
    // 1. บันทึกลง Database
    const created = await this.model.create({ user_id: userId, title, message, type });

    // 2. ยิง Real-time ไปที่หน้าจอ
    this.gateway.sendToUser(userId, {
      id: created._id,
      title,
      message,
      type,
      createdAt: created['createdAt'],
    });

    return created;
  }

  async getMyNotifications(userId: string) {
    return this.model.find({ user_id: userId }).sort({ createdAt: -1 }).limit(20);
  }
  async markAsRead(notificationId: string, userId: string) {
    return this.model.findOneAndUpdate(
      { _id: notificationId, user_id: userId },
      { $set: { is_read: true } },
      { new: true }
    );
  }

  async markAllAsRead(userId: string) {
    await this.model.updateMany(
      { user_id: userId, is_read: false },
      { $set: { is_read: true } }
    );
    return { success: true };
  }
}