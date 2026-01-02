import { IsString, IsNotEmpty, IsMongoId, IsNumber, Min } from "class-validator";

/**
 * DTO สำหรับสร้าง Session ใหม่
 * เมื่อลูกค้าจ่ายเงินและเริ่มใช้งาน
 */
export class CreateSessionDto {
  @IsMongoId({ message: "User ID must be a valid MongoDB ObjectId" })
  @IsNotEmpty()
  user_id: string;

  @IsMongoId({ message: "Device ID must be a valid MongoDB ObjectId" })
  @IsNotEmpty()
  device_id: string;

  @IsString()
  @IsNotEmpty()
  package: string; 

  @IsNumber()
  @Min(1, { message: "Total seconds must be at least 1" })
  total_seconds: number; // เวลาทั้งหมดที่ซื้อ (วินาที)
}

