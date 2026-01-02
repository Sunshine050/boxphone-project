import { Controller, Post, Body, ValidationPipe, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';


@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body(ValidationPipe) loginDto: LoginDto) {
        this.logger.log(`[LOGIN] Attempting login for username: ${loginDto.username}`);
        try {
            const result = await this.authService.login(loginDto);
            this.logger.log(`[LOGIN] ✅ Success - Username: ${loginDto.username}, Role: ${result.user.role}`);
            return result;
        } catch (error) {
            this.logger.error(`[LOGIN] ❌ Failed - Username: ${loginDto.username}, Error: ${error.message}`);
            throw error;
        }
    }

    @Post('register')
    async register(@Body(ValidationPipe) registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }
}
