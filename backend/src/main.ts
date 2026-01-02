import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, Logger } from "@nestjs/common";
import { seedAdmin } from "./seed/seed-admin";

/**
 * Main Entry Point
 *
 * เพิ่ม:
 * 1. ValidationPipe - Auto validate DTO ทุก Request
 * 2. seedAdmin() - สร้าง Admin User ครั้งแรก (ถ้ายังไม่มี)
 * 3. Global Logger - Log ทุก request และ error
 */
async function bootstrap() {
  const logger = new Logger("Bootstrap");

  logger.log("🚀 Starting application...");

  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });
  const configService = app.get(ConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Enable CORS for Frontend
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
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
