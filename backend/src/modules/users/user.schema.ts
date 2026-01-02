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
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password_hash: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({ default: 0 })
  credits: number;

  @Prop({ type: String })
  package: string; // แพคเกจที่เลือก (เช่น 'BASIC', 'PREMIUM', 'ENTERPRISE')

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Prop({ type: Date })
  start_date: Date;

  @Prop({ type: Types.ObjectId, ref: "Device", default: null })
  device_id: Types.ObjectId | null; 
}

export const UserSchema = SchemaFactory.createForClass(User);
