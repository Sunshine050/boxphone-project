import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser Decorator - ดึงข้อมูล User ที่ Login มาจาก Request
 * 
 * ตัวอย่างการใช้งาน:
 * @Get('/me')
 * getProfile(@CurrentUser() user) {
 *   return user; // { userId, username, role }
 * }
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
