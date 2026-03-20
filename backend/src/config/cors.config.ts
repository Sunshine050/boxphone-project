import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

export function getCorsConfig(configService: ConfigService): CorsOptions {
  const originsEnv = configService.get<string>('CORS_ORIGINS');
  const nodeEnv = configService.get<string>('NODE_ENV');
  const list =
    originsEnv
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  let origin: CorsOptions['origin'];

  if (nodeEnv === 'production') {
    if (list.length === 0) {
      throw new Error(
        'CORS_ORIGINS is required in production. Set comma-separated origins, e.g. https://user.example.com,https://admin.example.com',
      );
    }
    origin = list.length === 1 ? list[0] : list;
  } else {
    // development: ไม่ตั้ง = อนุญาตทุก origin (สะดวก localhost)
    origin = list.length ? (list.length === 1 ? list[0] : list) : true;
  }

  return {
    origin,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: [],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}
