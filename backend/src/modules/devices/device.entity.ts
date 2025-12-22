import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DeviceStatus {
    AVAILABLE = 'AVAILABLE',
    BUSY = 'BUSY',
    OFFLINE = 'OFFLINE',
}

@Entity()
export class Device {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    serial_number: string;

    @Column({
        type: 'enum',
        enum: DeviceStatus,
        default: DeviceStatus.OFFLINE,
    })
    status: DeviceStatus;

    @Column({ nullable: true })
    current_user_id: string; // If busy

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
