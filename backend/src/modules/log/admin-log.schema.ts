import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class AdminLog extends Document {
  @Prop({ required: true })
  type: string; // 'USER_CREATED' | 'TIME_ADDED' | 'DEVICE_ASSIGNED' | 'SESSION_START' | 'SESSION_END'

  @Prop({ required: true })
  level: string; // 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'

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