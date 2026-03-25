import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Auth Guard - ป้องกัน Route ที่ต้อง Login
 * 
 * วิธีใช้: @UseGuards(JwtAuthGuard) ใน Controller
 * ถ้าไม่มี Token หรือ Token ไม่ถูกต้อง จะ Return 401 Unauthorized
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization;
        const cookieToken = request.cookies?.access_token;

        // Browser ใช้ cookie; API clients มักใช้ Bearer — ไม่มีทั้งคู่ค่อยถือว่า “ไม่ส่ง credential”
        if (!authHeader && !cookieToken) {
            this.logger.warn(
                `[AUTH] ❌ No JWT (no Authorization header or access_token cookie) - Method: ${request.method}, Path: ${request.url}`,
            );
        } else if (!authHeader && cookieToken) {
            this.logger.debug(
                `[AUTH] Cookie JWT - Method: ${request.method}, Path: ${request.url}`,
            );
        } else {
            this.logger.debug(`[AUTH] Bearer token - Method: ${request.method}, Path: ${request.url}`);
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        
        if (err || !user) {
            this.logger.error(`[AUTH] ❌ Unauthorized - Method: ${request.method}, Path: ${request.url}, Error: ${err?.message || info?.message || 'Invalid token'}`);
            throw err || new Error('Unauthorized');
        }

        this.logger.debug(`[AUTH] ✅ Authenticated - User: ${user.username}, Role: ${user.role}, Method: ${request.method}, Path: ${request.url}`);
        return user;
    }
}
