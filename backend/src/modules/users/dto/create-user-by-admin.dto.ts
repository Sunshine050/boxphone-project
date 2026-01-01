import { IsString, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../user.schema';

/**
 * DTO สำหรับแอดมินสร้าง User ใหม่
 * ต้องมี username, password, role และ package
 */
export class CreateUserByAdminDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;

    @IsString()
    @IsNotEmpty()
    package: string;  // แพคเกจที่เลือก (เช่น 'BASIC', 'PREMIUM', 'ENTERPRISE')
}

