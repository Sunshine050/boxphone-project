import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Auth Module - รวม Component ทั้งหมดของระบบ Authentication
 * 
 * Imports:
 * - UsersModule: เพื่อใช้ UsersService ในการดึงข้อมูล User
 * - PassportModule: สำหรับ JWT Authentication
 * - JwtModule: สร้างและ Verify JWT Token (ใช้ค่าจาก .env)
 * 
 * Providers:
 * - AuthService: Business Logic
 * - JwtStrategy: Passport Strategy สำหรับตรวจสอบ Token
 */
@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION') || '1d',
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
