import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../modules/users/users.service";
import { UserRole } from "../modules/users/user.schema";
import * as bcrypt from "bcrypt";

/**
 * Seed Admin User
 *
 * ทำงาน:
 * - เช็คว่ามี Admin User อยู่แล้วหรือยัง
 * - ถ้ายังไม่มี สร้าง Admin คนแรกโดยใช้ค่าจาก Environment Variable
 *
 * Environment Variables ที่ต้องมี (ใน .env):
 * - ADMIN_USERNAME=admin
 * - ADMIN_PASSWORD=admin123
 *
 * ⚠️ ไม่มี Hardcode! ทุกค่ามาจาก .env
 */
export async function seedAdmin(app: INestApplication) {
  const usersService = app.get(UsersService);
  const configService = app.get(ConfigService);

  const adminUsername = configService.get<string>("ADMIN_USERNAME");
  const adminPassword = configService.get<string>("ADMIN_PASSWORD");

  if (!adminUsername || !adminPassword) {
    console.warn(
      "⚠️  ADMIN_USERNAME or ADMIN_PASSWORD not found in .env, skipping admin seed"
    );
    return;
  }

  // เช็คว่ามี Admin อยู่แล้วหรือยัง
  const existingAdmin = await usersService.findOne(adminUsername);

  if (existingAdmin) {
    console.log("✓ Admin user already exists");
    return;
  }

  // สร้าง Admin User
  const saltRounds = configService.get<number>("BCRYPT_SALT_ROUNDS");
  if (!saltRounds) {
    console.warn(
      "⚠️  BCRYPT_SALT_ROUNDS not found in .env, skipping admin seed"
    );
    return;
  }
  const password_hash = await bcrypt.hash(adminPassword, saltRounds);

  const adminCredits = configService.get<number>("ADMIN_CREDITS");
  if (adminCredits === undefined) {
    console.warn("⚠️  ADMIN_CREDITS not found in .env, skipping admin seed");
    return;
  }
  await usersService.create({
    username: adminUsername,
    password_hash,
    role: UserRole.ADMIN,
    credits: adminCredits,
  });

  console.log(`✓ Admin user created: ${adminUsername}`);
}
