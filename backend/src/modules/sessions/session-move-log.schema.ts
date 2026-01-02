import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type SessionMoveLogDocument = HydratedDocument<SessionMoveLog>;

/**
 * Log การย้าย Session ไปเครื่องอื่น
 * ใช้สำหรับป้องกันการโกง
 */
@Schema({ timestamps: true })
export class SessionMoveLog {
  @Prop({ type: Types.ObjectId, ref: "Session", required: true })
  session_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Device", default: null })
  from_device_id: Types.ObjectId | null; // เครื่องเก่า (null = ไม่มีเครื่อง)

  @Prop({ type: Types.ObjectId, ref: "Device", required: true })
  to_device_id: Types.ObjectId; // เครื่องใหม่

  @Prop({ type: Number, required: true })
  remaining_seconds: number; // เวลาที่เหลือ ณ ตอนย้าย

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  moved_by: Types.ObjectId; // พนักงานที่ย้าย (staff/admin)

  @Prop({ type: String, default: null })
  reason: string | null; // เหตุผลที่ย้าย
}

export const SessionMoveLogSchema =
  SchemaFactory.createForClass(SessionMoveLog);

// Index
SessionMoveLogSchema.index({ session_id: 1 });
SessionMoveLogSchema.index({ moved_by: 1 });

