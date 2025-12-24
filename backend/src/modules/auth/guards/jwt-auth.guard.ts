import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Auth Guard - ป้องกัน Route ที่ต้อง Login
 * 
 * วิธีใช้: @UseGuards(JwtAuthGuard) ใน Controller
 * ถ้าไม่มี Token หรือ Token ไม่ถูกต้อง จะ Return 401 Unauthorized
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }
