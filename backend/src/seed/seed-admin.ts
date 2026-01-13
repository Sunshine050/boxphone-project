import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../modules/users/users.service";

/**
 * Seed Admin User
 */
export async function seedAdmin(app: INestApplication) {
  const usersService = app.get(UsersService);
  const configService = app.get(ConfigService);

  const adminUsername = configService.get<string>("ADMIN_USERNAME");
  const adminPassword = configService.get<string>("ADMIN_PASSWORD");

  if (!adminUsername || !adminPassword) {
    console.warn("⚠️ ADMIN_USERNAME or ADMIN_PASSWORD not found");
    return;
  }

  const existingAdmin = await usersService.findByUsername(adminUsername);
  if (existingAdmin) {
    console.log("✓ Admin user already exists");
    return;
  }

  // ✅ seed admin ต้องเป็น ADMIN
  await usersService.createAdmin({
    name: "Administrator",
    username: adminUsername,
    password: adminPassword,
  });

  console.log(`✓ Admin user created: ${adminUsername}`);
}
