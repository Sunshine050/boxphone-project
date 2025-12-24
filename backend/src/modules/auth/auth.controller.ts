import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Auth Controller - จัดการ HTTP Requests สำหรับ Authentication
 * 
 * Routes:
 * POST /auth/login    - Login (ใครก็เรียกได้)
 * POST /auth/register - Register (ใครก็เรียกได้)
 * 
 * หมายเหตุ: ในระบบจริง Register อาจต้องมีการป้องกัน
 * เช่น ให้เฉพาะ Admin สร้าง User ได้
 */
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body(ValidationPipe) loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    async register(@Body(ValidationPipe) registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }
}
