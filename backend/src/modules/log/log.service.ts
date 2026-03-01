import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminLog, LogLevel, LogType } from './admin-log.schema';

@Injectable()
export class LogService {
  constructor(
    @InjectModel(AdminLog.name) private logModel: Model<AdminLog>,
  ) {}

  private normalizeType(type: string): LogType {
    if (Object.values(LogType).includes(type as LogType)) {
      return type as LogType;
    }
    return LogType.SESSION_STARTED; // fallback กัน error
  }

  private normalizeLevel(level: string): LogLevel {
    if (Object.values(LogLevel).includes(level as LogLevel)) {
      return level as LogLevel;
    }
    return LogLevel.INFO; // fallback
  }

  async createLog(data: {
    type: string;
    level: string;
    message: string;
    target_user_id?: string;
    target_device_id?: string;
    admin_username?: string;
    meta?: Record<string, any>;
  }) {

    const newLog = new this.logModel({
      ...data,
      type: this.normalizeType(data.type),
      level: this.normalizeLevel(data.level),
    });

    return newLog.save();
  }

  async findAll(type?: string) {
    const filter = type ? { type } : {};
    return this.logModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('target_user_id', 'username name')
      .populate('target_device_id', 'name serial_number')
      .exec();
  }
}