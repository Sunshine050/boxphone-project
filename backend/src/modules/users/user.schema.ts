import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum UserStatus {
  PENDING = "PENDING",
  INUSE = "INUSE",
  INACTIVE = "INACTIVE",
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password_hash: string;

  @Prop({ required: true })
  password_plain: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({ default: 0 })
  total_seconds: number;

  @Prop({ default: 0 })
  remaining_seconds: number;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Prop({ type: Date, default: Date.now })
  start_date: Date;

  @Prop({ type: Date, default: null })
  started_at: Date | null; 

  @Prop({ type: Types.ObjectId, ref: "Device", default: null })
  device_id: Types.ObjectId | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
