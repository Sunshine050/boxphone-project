import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, Logger } from "@nestjs/common";
import { seedAdmin } from "./seed/seed-admin";
import { getValidationPipeConfig, getLoggerConfig } from "./config/app.config";

/**
 * Main Entry Point
 *
 * เพิ่ม:
 * 1. ValidationPipe - Auto validate DTO ทุก Request
 * 2. seedAdmin() - สร้าง Admin User ครั้งแรก (ถ้ายังไม่มี)
 * 3. Global Logger - Log ทุก request และ error
 * 4. CORS Configuration - จาก config file
 */
async function bootstrap() {
  const logger = new Logger("Bootstrap");

  logger.log("🚀 Starting application...");

  const app = await NestFactory.create(AppModule, {
    logger: getLoggerConfig(),
  });
  const configService = app.get(ConfigService);

  // Validation Pipe Configuration
  app.useGlobalPipes(new ValidationPipe(getValidationPipeConfig()));

  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow all origins in development
      callback(null, true);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
    exposedHeaders: [],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const port = configService.get<number>("PORT");
  if (!port) {
    throw new Error("PORT is not configured");
  }
  await app.listen(port, "0.0.0.0");

  logger.log(`✅ Application is running on: ${await app.getUrl()}`);
  logger.log(
    `📝 Logging enabled - All requests and errors will be shown in terminal`
  );

  // Seed Admin User
  logger.log("👤 Seeding admin user...");
  await seedAdmin(app);
  logger.log("✅ Admin user seeded");
}
bootstrap();
