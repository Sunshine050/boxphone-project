import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

/**
 * DTO สำหรับเชื่อม User กับ Device
 * เมื่อเชื่อมสำเร็จ status จะเปลี่ยนเป็น INUSE
 */
export class ConnectDeviceDto {
    @IsMongoId({ message: 'Device ID must be a valid MongoDB ObjectId' })
    @IsNotEmpty()
    device_id: string;
}

