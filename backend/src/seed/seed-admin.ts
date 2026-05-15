import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../modules/users/users.service";

/**
 * Seed / Reset Admin User
 * - ถ้าไม่มี admin -> สร้างใหม่
 * - ถ้ามีอยู่แล้ว -> อัปเดตรหัสผ่านและ role ตามค่าใน .env
 */
export async function seedAdmin(app: INestApplication) {
  console.log("[SeedAdmin] start");

  const usersService = app.get(UsersService);
  const configService = app.get(ConfigService);

  const adminUsername = configService.get<string>("ADMIN_USERNAME");
  const adminPassword = configService.get<string>("ADMIN_PASSWORD");

  console.log("[SeedAdmin] ENV", {
    ADMIN_USERNAME: adminUsername,
    hasPassword: !!adminPassword,
  });

  if (!adminUsername || !adminPassword) {
    console.warn(
      "[SeedAdmin] ⚠️ ADMIN_USERNAME or ADMIN_PASSWORD not found in .env – skip seeding admin",
    );
    return;
  }

  try {
    const admin = await usersService.createAdmin({
      name: "Administrator",
      username: adminUsername,
      password: adminPassword,
    });

    console.log(
      `[SeedAdmin] ✅ Admin user ensured: username="${admin.username}" (password resetตาม .env)`,
    );
  } catch (e: any) {
    console.error("[SeedAdmin] ❌ Failed to seed admin user:", e?.message || e);
  }
}