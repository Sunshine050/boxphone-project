import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { seedAdmin } from './seed/seed-admin';

/**
 * Main Entry Point
 * 
 * เพิ่ม:
 * 1. ValidationPipe - Auto validate DTO ทุก Request
 * 2. seedAdmin() - สร้าง Admin User ครั้งแรก (ถ้ายังไม่มี)
 */
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Enable validation globally
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true, // ลบ field ที่ไม่ต้องการออก
        forbidNonWhitelisted: true, // Error ถ้ามี field แปลกๆ
    }));

    // Enable CORS for Frontend
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });

    const port = configService.get<number>('PORT') || 3001;
    await app.listen(port);
    console.log(`Application is running on: ${await app.getUrl()}`);

    // Seed Admin User
    await seedAdmin(app);
}
bootstrap();
