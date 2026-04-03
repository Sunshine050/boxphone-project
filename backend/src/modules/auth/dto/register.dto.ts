import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO สำหรับการสร้าง User ใหม่
 * ใช้สำหรับ Register และ Admin เพิ่ม User
 */
export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}
