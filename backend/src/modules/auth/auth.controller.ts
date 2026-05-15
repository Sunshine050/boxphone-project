import {
  Controller,
  Post,
  Get,
  Body,
  ValidationPipe,
  Logger,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginAttemptService } from './services/login-attempt.service';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from '../users/user.schema';

function getCookieOptions(isProduction: boolean, config: ConfigService) {
  const domain = config.get<string>('COOKIE_DOMAIN')?.trim();
  const base = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {}),
  };
  return base;
}

function getCsrfCookieOptions(isProduction: boolean, config: ConfigService) {
  const domain = config.get<string>('COOKIE_DOMAIN')?.trim();
  return {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly loginAttemptService: LoginAttemptService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const maskedUser = loginDto.username.slice(0, 2) + '***';

    if (this.loginAttemptService.isLocked(ip, loginDto.username)) {
      const remaining = this.loginAttemptService.getRemainingLockSeconds(ip, loginDto.username);
      this.logger.warn(`[LOGIN] Locked out ip=${ip} user=${maskedUser} remaining=${remaining}s`);
      throw new ForbiddenException(
        `Too many failed attempts. Try again in ${remaining} seconds.`,
      );
    }

    this.logger.log(`[LOGIN] Attempt ip=${ip} user=${maskedUser}`);

    try {
      const result = await this.authService.login(loginDto);

      this.loginAttemptService.recordSuccess(ip, loginDto.username);

      const isProduction = this.configService.get('NODE_ENV') === 'production';
      const cookieOpts = getCookieOptions(isProduction, this.configService);

      const jwtExpiry = this.configService.get<string>('JWT_EXPIRATION') || '1d';
      const maxAgeMs = this.parseExpiryToMs(jwtExpiry);

      res.cookie('access_token', result.access_token, {
        ...cookieOpts,
        maxAge: maxAgeMs,
      });

      const csrfToken = randomBytes(32).toString('hex');
      res.cookie('csrf_token', csrfToken, {
        ...getCsrfCookieOptions(isProduction, this.configService),
        maxAge: maxAgeMs,
      });

      this.logger.log(`[LOGIN] Success ip=${ip} user=${maskedUser} role=${result.user.role}`);

      return { user: result.user };
    } catch (error) {
      this.loginAttemptService.recordFailure(ip, loginDto.username);
      this.logger.warn(`[LOGIN] Failed ip=${ip} user=${maskedUser}`);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const cookieOpts = getCookieOptions(isProduction, this.configService);
    const csrfOpts = getCsrfCookieOptions(isProduction, this.configService);

    res.clearCookie('access_token', cookieOpts);
    res.clearCookie('csrf_token', csrfOpts);

    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = (req as any).user;
    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  private parseExpiryToMs(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 24 * 60 * 60 * 1000; // default 1 day
    const val = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return val * 1000;
      case 'm': return val * 60 * 1000;
      case 'h': return val * 60 * 60 * 1000;
      case 'd': return val * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}
