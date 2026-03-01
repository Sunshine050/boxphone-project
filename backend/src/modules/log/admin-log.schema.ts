import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LogType {
  USER_CREATED = "USER_CREATED",
  TIME_ADDED = "TIME_ADDED",
  DEVICE_ASSIGNED = "DEVICE_ASSIGNED",
  DEVICE_DISCONNECTED = "DEVICE_DISCONNECTED",
  SESSION_STARTED = "SESSION_STARTED",
  SESSION_ENDED = "SESSION_ENDED",
}

export enum LogLevel {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

@Schema({ timestamps: true })
export class AdminLog extends Document {

  @Prop({ required: true, enum: LogType })
  type: LogType;

  @Prop({ required: true, enum: LogLevel })
  level: LogLevel;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  target_user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Device' })
  target_device_id: Types.ObjectId;

  @Prop()
  admin_username: string;

  @Prop({ type: Object })
  meta: Record<string, any>;
}

export const AdminLogSchema = SchemaFactory.createForClass(AdminLog);