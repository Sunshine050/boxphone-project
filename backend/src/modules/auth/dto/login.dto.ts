import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** ลบ control characters และ null bytes ที่อาจใช้ injection */
function sanitizeString(val: unknown): string {
  if (val == null) return '';
  const s = String(val).replace(/\0/g, '').replace(/[\x00-\x1F\x7F]/g, '');
  return s.trim();
}

/**
 * DTO สำหรับการ Login
 * ป้องกัน injection: รับเฉพาะ string, trim, จำกัดความยาว, ลบ control chars
 */
export class LoginDto {
    @Transform(({ value }) => sanitizeString(value))
    @IsString()
    @IsNotEmpty({ message: 'กรุณากรอกชื่อผู้ใช้' })
    @MaxLength(256, { message: 'ชื่อผู้ใช้ยาวเกินไป' })
    username: string;

    @Transform(({ value }) => (typeof value === 'string' ? value : ''))
    @IsString()
    @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
    @MinLength(6, { message: 'รหัสผ่านต้องไม่ต่ำกว่า 6 ตัวอักษร' })
    @MaxLength(512, { message: 'รหัสผ่านยาวเกินไป' })
    password: string;
}
