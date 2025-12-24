import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/user.schema';

/**
 * Roles Decorator - ใช้กำหนด Role ที่อนุญาตให้เข้า Route
 * 
 * ตัวอย่างการใช้งาน:
 * @Roles(UserRole.ADMIN)
 * @Get('/admin-only')
 * adminOnlyRoute() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
