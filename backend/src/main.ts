import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { seedAdmin } from './seed/seed-admin';
import { getValidationPipeConfig } from './config/app.config';
import { getCorsConfig } from './config/cors.config';
import { PrettyLogger } from './common/logger/pretty-logger';
import { ConfigurableSocketIoAdapter } from './common/adapters/configurable-socket-io.adapter';

function assertStrongSecurityConfig(configService: ConfigService): void {
  const jwtSecret = configService.get<string>('JWT_SECRET')?.trim() || '';
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('change-me')) {
    throw new Error('Unsafe JWT_SECRET configuration');
  }

  const deviceSocketSecret = configService.get<string>('DEVICE_SOCKET_SECRET')?.trim() || '';
  if (!deviceSocketSecret || deviceSocketSecret.length < 32 || deviceSocketSecret.startsWith('change-me')) {
    throw new Error(
      'Unsafe DEVICE_SOCKET_SECRET configuration — must be at least 32 characters and not a default value',
    );
  }

  const nodeEnv = configService.get<string>('NODE_ENV');
  if (nodeEnv === 'production') {
    const adminUser = configService.get<string>('ADMIN_USERNAME')?.trim().toLowerCase() || '';
    const adminPass = configService.get<string>('ADMIN_PASSWORD')?.trim() || '';
    if (adminUser === 'admin' || adminPass.length < 12 || adminPass.includes('change-me')) {
      throw new Error('Unsafe ADMIN credentials for production');
    }

    const corsOrigins = configService.get<string>('CORS_ORIGINS')?.trim() || '';
    if (!corsOrigins) {
      throw new Error('CORS_ORIGINS is required in production');
    }
  }
}

async function bootstrap() {
  const logger = new PrettyLogger('Bootstrap');

  /* ── เปิดเฉพาะ error / warn / log — ตัด debug & verbose ออกเพื่อลด noise ── */
  const appLogger = new PrettyLogger();
  appLogger.setLogLevels(['error', 'warn', 'log']);

  const app = await NestFactory.create(AppModule, {
    logger: appLogger,
  });

  const configService = app.get(ConfigService);
  assertStrongSecurityConfig(configService);

  app.use(
    helmet({
      // ให้เบราว์เซอร์เรียก API ข้ามโดเมน (user/admin คนละ subdomain) ได้เมื่อใช้ credentials
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  const trustProxy = configService.get<string>('TRUST_PROXY');
  if (trustProxy === 'true' || trustProxy === '1') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.useWebSocketAdapter(new ConfigurableSocketIoAdapter(app, configService));

  // Limit JSON body to 1 MB
  const express = require('express');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.useGlobalPipes(new ValidationPipe(getValidationPipeConfig()));

  app.enableCors(getCorsConfig(configService));

  const port = configService.get<number>('PORT');
  if (!port) {
    throw new Error('PORT is not configured');
  }
  await app.listen(port, '0.0.0.0');

  logger.separator();
  logger.log(`Server ready → http://0.0.0.0:${port}`);
  logger.separator();

  const allowSeedInProd =
    (configService.get<string>('ALLOW_ADMIN_SEED_IN_PRODUCTION') || '').toLowerCase() === 'true';
  const isProd = configService.get<string>('NODE_ENV') === 'production';
  if (!isProd || allowSeedInProd) {
    await seedAdmin(app);
  } else {
    logger.warn('Skipping admin seed in production (set ALLOW_ADMIN_SEED_IN_PRODUCTION=true to override)');
  }
}
bootstrap();
