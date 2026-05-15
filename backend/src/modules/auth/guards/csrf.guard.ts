import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Double-submit cookie CSRF guard.
 * Compares the `csrf_token` cookie with the `X-CSRF-Token` header.
 * Only applied to state-changing methods (POST, PATCH, PUT, DELETE).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  /** Path ที่ใช้เทียบ route (รองรับ reverse proxy / trailing slash) */
  private normalizePath(request: Request): string {
    const raw =
      (request as { path?: string }).path ||
      (typeof request.url === 'string' ? request.url.split('?')[0] : '') ||
      '';
    let p = raw.trim();
    if (!p.startsWith('/')) p = `/${p}`;
    p = p.replace(/\/+$/, '') || '/';
    return p;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Login ยังไม่มี csrf_token cookie — double-submit เริ่มหลัง login สำเร็จ
    const path = this.normalizePath(request);
    if (method === 'POST' && path === '/auth/login') {
      return true;
    }

    // NOTE: bearer bypass ถูกลบออก — browser clients (user/admin) ใช้ HttpOnly cookie เท่านั้น
    // การ bypass CSRF เพราะมี Bearer header เปิดช่องให้ XSS ขโมย token ได้ถ้า token เคย expose ใน JS

    const cookieToken = request.cookies?.csrf_token;
    const headerToken = request.headers['x-csrf-token'] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      this.logger.warn(
        `[CSRF] Blocked ${method} ${request.url} — cookie=${!!cookieToken} header=${!!headerToken}`,
      );
      throw new ForbiddenException('CSRF token mismatch');
    }

    return true;
  }
}
