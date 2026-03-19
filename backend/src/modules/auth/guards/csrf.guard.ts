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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

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
