import { IsString, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../../users/user.schema';

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

    @IsEnum(UserRole)
    role: UserRole;
}
