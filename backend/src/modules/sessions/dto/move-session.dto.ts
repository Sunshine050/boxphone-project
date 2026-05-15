import { IsMongoId, IsNotEmpty, IsString, IsOptional } from "class-validator";

/**
 * DTO สำหรับย้าย Session ไปเครื่องอื่น
 */
export class MoveSessionDto {
  @IsMongoId({ message: "Device ID must be a valid MongoDB ObjectId" })
  @IsNotEmpty()
  to_device_id: string; // เครื่องใหม่

  @IsString()
  @IsOptional()
  reason?: string; // เหตุผลที่ย้าย (optional)
}

