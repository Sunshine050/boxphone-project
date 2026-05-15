import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server } from 'socket.io';

/**
 * ตั้งค่า CORS ของ Socket.IO ให้สอดคล้องกับ REST (CORS_ORIGINS + NODE_ENV)
 * ใช้แทนการ hardcode origin: "*" ใน @WebSocketGateway
 */
export class ConfigurableSocketIoAdapter extends IoAdapter {
  constructor(
    private readonly nestApp: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(nestApp);
  }

  createIOServer(port: number, options?: Record<string, unknown>): Server {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const originsEnv = this.configService.get<string>('CORS_ORIGINS');
    const list =
      originsEnv
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

    let origin: boolean | string | string[];
    if (nodeEnv === 'production') {
      if (list.length === 0) {
        origin = false;
      } else {
        origin = list.length === 1 ? list[0] : list;
      }
    } else {
      // Avoid permissive wildcard fallback; explicitly list origins in all envs.
      origin = list.length ? (list.length === 1 ? list[0] : list) : false;
    }

    return super.createIOServer(port, {
      ...options,
      cors: {
        origin,
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
      },
    });
  }
}
