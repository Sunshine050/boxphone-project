import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

export function getCorsConfig(configService: ConfigService): CorsOptions {
  const originsEnv = configService.get<string>('CORS_ORIGINS');

  const origin = originsEnv
    ? originsEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : true; // allow all in development when CORS_ORIGINS is not set

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
