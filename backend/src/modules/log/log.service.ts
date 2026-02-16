// backend/src/modules/log/log.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminLog } from './admin-log.schema';

@Injectable()
export class LogService {
  constructor(
    @InjectModel(AdminLog.name) private logModel: Model<AdminLog>,
  ) {}

  // 🎯 ฟังก์ชันสำหรับบันทึก Log (เรียกใช้จาก Service อื่นๆ)
  async createLog(data: {
    type: string;
    level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    message: string;
    target_user_id?: string;
    target_device_id?: string;
    admin_username?: string;
    meta?: Record<string, any>;
  }) {
    const newLog = new this.logModel(data);
    return newLog.save();
  }

  // 🎯 ฟังก์ชันสำหรับดึง Log ทั้งหมด (เรียงจากใหม่ไปเก่า)
  async findAll(type?: string) {
    const filter = type ? { type } : {};
    return this.logModel
      .find(filter)
      .sort({ createdAt: -1 }) // ล่าสุดขึ้นก่อน
      .populate('target_user_id', 'username name') // ดึงชื่อ user มาด้วย
      .populate('target_device_id', 'name serial_number') // ดึงข้อมูลเครื่องมาด้วย
      .exec();
  }
}