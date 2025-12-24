import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO สำหรับการ Login
 * ใช้ class-validator เพื่อตรวจสอบข้อมูลที่รับมาจาก Client
 */
export class LoginDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}
