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
  @Prop({ required: true })
  device_id: string;

  @Prop({ default: 0 })
  total_seconds: number;

  @Prop({ default: 0 })
  remaining_seconds: number;

  @Prop({ default: null })
  started_at: Date | null;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;
}

export const UserDeviceSchema = SchemaFactory.createForClass(UserDevice);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password_hash: string;

  @Prop({ default: "" })
  password_plain: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  // ✅ เวลารวม (ของเดิม)
  @Prop({ default: 0 })
  total_seconds: number;

  @Prop({ default: 0 })
  remaining_seconds: number;

  @Prop({ default: null })
  started_at: Date | null;

  @Prop({ default: new Date() })
  start_date: Date;

  @Prop({ default: null })
  device_id: string | null;
  
  @Prop({ type: [UserDeviceSchema], default: [] })
  devices: UserDevice[];
}

export const UserSchema = SchemaFactory.createForClass(User);
