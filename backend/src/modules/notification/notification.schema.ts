import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: ['INFO', 'WARNING', 'SUCCESS', 'DANGER'], default: 'INFO' })
  type: string;

  @Prop({ default: false })
  is_read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);