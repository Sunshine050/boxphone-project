import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/user.schema';

/**
 * Roles Guard - ตรวจสอบ Role ของ User
 * 
 * ใช้ร่วมกับ @Roles() Decorator
 * ตัวอย่าง: @Roles(UserRole.ADMIN)
 * 
 * ทำงาน:
 * 1. ดึง Roles ที่กำหนดใน Decorator
 * 2. เทียบกับ Role ของ User ที่ Login (จาก Request.user)
 * 3. ถ้าไม่ตรง Return false (403 Forbidden)
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true; // ไม่มีการกำหนด Role = ใครก็เข้าได้
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        return requiredRoles.some((role) => user.role === role);
    }
}
