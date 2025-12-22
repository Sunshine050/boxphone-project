import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeviceDocument = HydratedDocument<Device>;

export enum DeviceStatus {
    AVAILABLE = 'AVAILABLE',
    BUSY = 'BUSY',
    OFFLINE = 'OFFLINE',
}

@Schema({ timestamps: true })
export class Device {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    serial_number: string;

    @Prop({
        type: String,
        enum: DeviceStatus,
        default: DeviceStatus.OFFLINE,
    })
    status: DeviceStatus;

    @Prop()
    current_user_id: string;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
