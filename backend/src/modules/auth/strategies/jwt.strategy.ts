import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

/**
 * JWT Strategy - จัดการการตรวจสอบ JWT Token
 * 
 * ทำงาน:
 * 1. ดึง Token จาก Header (Authorization: Bearer <token>)
 * 2. Verify Token ด้วย Secret Key จาก .env
 * 3. เรียก validate() เพื่อดึงข้อมูล User จาก Database
 * 4. ส่งข้อมูล User ไปให้ Controller ผ่าน Request.user
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: any) {
        const user = await this.authService.validateUser(payload.sub);

        if (!user) {
            throw new UnauthorizedException();
        }

        // ข้อมูลนี้จะถูกใส่ใน Request.user
        return {
            userId: (user as any).id || (user as any)._id.toString(),
            username: user.username,
            role: user.role,
        };
    }
}
