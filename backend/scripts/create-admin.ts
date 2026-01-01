import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { UsersService } from "../src/modules/users/users.service";
import { UserRole } from "../src/modules/users/user.schema";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

async function createAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const configService = app.get(ConfigService);

  const adminUsername = configService.get<string>("ADMIN_USERNAME") || "admin";
  const adminPassword =
    configService.get<string>("ADMIN_PASSWORD") || "admin123";

  // เช็คว่ามี Admin อยู่แล้วหรือยัง
  const existingAdmin = await usersService.findOne(adminUsername);

  if (existingAdmin) {
    console.log(`✓ Admin user already exists: ${adminUsername}`);
    await app.close();
    return;
  }

  // สร้าง Admin User
  const saltRounds = configService.get<number>("BCRYPT_SALT_ROUNDS") || 10;
  const password_hash = await bcrypt.hash(adminPassword, saltRounds);

  const adminCredits = configService.get<number>("ADMIN_CREDITS") || 999999;

  try {
    const admin = await usersService.create({
      username: adminUsername,
      password_hash,
      role: UserRole.ADMIN,
      credits: adminCredits,
    });

    console.log(`✓ Admin user created successfully!`);
    console.log(`  Username: ${adminUsername}`);
    console.log(`  Password: ${adminPassword}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  ID: ${(admin as any)._id}`);
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
  }

  await app.close();
}

createAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
