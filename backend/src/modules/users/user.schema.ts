import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

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

@Schema({ _id: false })
export class UserDevice {
  @Prop({ type: String, required: true })
  device_id: string;

  @Prop({ type: Number, default: 0 })
  total_seconds: number;

  @Prop({ type: Number, default: 0 })
  remaining_seconds: number;

  @Prop({ type: Date, required: false, default: null })
  started_at?: Date;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;
}

export const UserDeviceSchema =
  SchemaFactory.createForClass(UserDevice);

@Schema({ _id: false })
export class UserDeviceHistory {
  @Prop({ type: String, required: true })
  device_id: string;

  @Prop({ type: Date, required: true })
  last_used_at: Date;

  @Prop({ type: Number, default: 1 })
  use_count: number;
}

export const UserDeviceHistorySchema =
  SchemaFactory.createForClass(UserDeviceHistory);

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  username: string;

  @Prop({ type: String, required: true })
  password_hash: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Prop({ type: Number, default: 0 })
  total_seconds: number;

  @Prop({ type: Number, default: 0 })
  remaining_seconds: number;

  @Prop({ type: Date, required: false, default: null })
  started_at?: Date;

  @Prop({ type: Date, default: new Date() })
  start_date: Date;

  @Prop({ type: String, required: false, default: null })
  device_id?: string;

  @Prop({ type: String, default: null })
  discord_id: string | null;

  @Prop({ type: [UserDeviceSchema], default: [] })
  devices: UserDevice[];

  @Prop({ type: [UserDeviceHistorySchema], default: [] })
  device_history: UserDeviceHistory[];
}

export const UserSchema = SchemaFactory.createForClass(User);