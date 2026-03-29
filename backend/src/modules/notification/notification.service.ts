import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NOTIFICATION_TTL_DAYS } from './notification.schema';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private readonly model: Model<Notification>,
    private readonly gateway: NotificationGateway,
  ) { }

  async createAndSend(userId: string, title: string, message: string, type: string = 'INFO') {
    const expiresAt = new Date(Date.now() + NOTIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    // 1. บันทึกลง Database พร้อม TTL (MongoDB จะลบอัตโนมัติหลัง NOTIFICATION_TTL_DAYS วัน)
    const created = await this.model.create({ user_id: userId, title, message, type, expires_at: expiresAt });

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

  /** แจ้งให้ user รีเฟรช session (real-time เมื่อ admin pause/resume/cancel หรือหมดเวลา) */
  notifySessionUpdate(userId: string) {
    this.gateway.sendSessionUpdate(userId);
  }

  async getMyNotifications(userId: string, page: number = 1, limit: number = 10) {
    const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit));
    const take = Math.min(50, Math.max(1, limit));
    const [items, total, totalUnread] = await Promise.all([
      this.model.find({ user_id: userId }).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      this.model.countDocuments({ user_id: userId }),
      this.model.countDocuments({ user_id: userId, is_read: false }),
    ]);
    return { items, total, page: Math.max(1, page), limit: take, totalUnread };
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

  async deleteNotification(notificationId: string, userId: string) {
    const deleted = await this.model.findOneAndDelete({
      _id: notificationId,
      user_id: userId,
    });
    return !!deleted;
  }

  async clearAll(userId: string) {
    const result = await this.model.deleteMany({ user_id: userId });
    return { deleted: result.deletedCount };
  }
}