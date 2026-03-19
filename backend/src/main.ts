import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { seedAdmin } from './seed/seed-admin';
import { getValidationPipeConfig } from './config/app.config';
import { getCorsConfig } from './config/cors.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  logger.log('Starting application...');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

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

  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log('Logging enabled');

  logger.log('Seeding admin user...');
  await seedAdmin(app);
  logger.log('Admin user seeded');
}
bootstrap();
