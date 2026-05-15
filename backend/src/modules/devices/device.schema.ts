import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeviceDocument = HydratedDocument<Device>;

export enum DeviceStatus {
    AVAILABLE = 'AVAILABLE',
    BUSY = 'INUSE',
    OFFLINE = 'OFFLINE',
    UNDER_REPAIR = 'UNDER_REPAIR',
    DAMAGED = 'DAMAGED',
    QUARANTINE = 'QUARANTINE',
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

    @Prop({ type: String })
    model: string;

    @Prop({ type: Number })
    sdk_version: number;

    @Prop({ type: Object })
    metadata: any;

    @Prop({ type: String })
    current_user_id: string;

    @Prop({ type: String, required: false, default: null })
    previous_user_id?: string;

    @Prop({ type: Date, required: false, default: null })
    last_user_disconnected_at?: Date;

    @Prop({ type: Date })
    last_connected_at: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);