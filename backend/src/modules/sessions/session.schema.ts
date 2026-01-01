import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type SessionDocument = HydratedDocument<Session>;

export enum SessionStatus {
  ACTIVE = "ACTIVE", // กำลังใช้งาน
  PAUSED = "PAUSED", // หยุดชั่วคราว (disconnect)
  DISCONNECTED = "DISCONNECTED", // หลุด/เครื่องพัง
  COMPLETED = "COMPLETED", // หมดเวลาแล้ว
  CANCELLED = "CANCELLED", // ยกเลิก
}

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Device", default: null })
  device_id: Types.ObjectId | null; // null = ไม่ได้ผูกกับเครื่อง (paused/disconnected)

  @Prop({ type: String, required: true })
  package: string; // แพคเกจที่ซื้อ

  @Prop({ type: Number, required: true })
  total_seconds: number; // เวลาทั้งหมดที่ซื้อ (วินาที)

  @Prop({ type: Number, required: true })
  remaining_seconds: number; // เวลาที่เหลือ (วินาที) - ค่านี้ freeze เมื่อ pause

  @Prop({
    type: String,
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @Prop({ type: Date })
  start_time: Date; // เริ่มใช้งานครั้งแรก

  @Prop({ type: Date })
  pause_time: Date | null; // เวลาที่ pause (เมื่อ disconnect)

  @Prop({ type: Date })
  resume_time: Date | null; // เวลาที่ resume (เมื่อ reconnect/move)

  @Prop({ type: Number, default: 0 })
  moved_count: number; // จำนวนครั้งที่ย้ายเครื่อง

  @Prop({ type: Number })
  max_move_count: number; // จำกัดจำนวนครั้งที่ย้ายได้ (จาก config)

  @Prop({ type: String, default: null })
  disconnect_reason: string | null; // เหตุผลที่ disconnect
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Index สำหรับ query ที่ใช้บ่อย
SessionSchema.index({ user_id: 1, status: 1 });
SessionSchema.index({ device_id: 1, status: 1 });

