import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { seedAdmin } from './seed/seed-admin';
import { getValidationPipeConfig } from './config/app.config';
import { getCorsConfig } from './config/cors.config';
import { PrettyLogger } from './common/logger/pretty-logger';
import { ConfigurableSocketIoAdapter } from './common/adapters/configurable-socket-io.adapter';

async function bootstrap() {
  const logger = new PrettyLogger('Bootstrap');

  /* ── เปิดเฉพาะ error / warn / log — ตัด debug & verbose ออกเพื่อลด noise ── */
  const appLogger = new PrettyLogger();
  appLogger.setLogLevels(['error', 'warn', 'log']);

  const app = await NestFactory.create(AppModule, {
    logger: appLogger,
  });

  const configService = app.get(ConfigService);

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

  await seedAdmin(app);
}
bootstrap();
