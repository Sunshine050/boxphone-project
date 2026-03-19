import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { User, UserDocument, UserStatus, UserRole } from "./user.schema";
import * as bcrypt from "bcrypt";
import { CreateUserByAdminDto } from "./dto/create-user-by-admin.dto";
import { DeviceStatus } from "../devices/device.schema";
import { LogService } from "../log/log.service";
import { SessionsService } from "../sessions/sessions.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly logService: LogService,
    private readonly sessionsService: SessionsService,
  ) { }

  // ✅ map duration → seconds
  private durationMap = {
    "1d": 60 * 60 * 24,
    "7d": 60 * 60 * 24 * 7,
    "30d": 60 * 60 * 24 * 30,
    "90d": 60 * 60 * 24 * 90,
    "180d": 60 * 60 * 24 * 180,
    "365d": 60 * 60 * 24 * 365,
  } as const;

  private calcRemaining(user: any) {
    // ✅ ถ้าไม่มี devices เลย ให้คืนค่า 0 หรือค่า default
    if (!user.devices || user.devices.length === 0) {
      return user.remaining_seconds ?? 0;
    }

    const device = user.devices[0]; // สมมติว่าอิงจากเครื่องหลักเครื่องแรก
    const remainingDb = device.remaining_seconds ?? 0;
    const startedAt = device.started_at ? new Date(device.started_at) : null;

    if (!startedAt || user.status !== UserStatus.INUSE) return remainingDb;

    const now = Date.now();
    const elapsed = Math.floor((now - startedAt.getTime()) / 1000);

    const remaining = remainingDb - elapsed;
    return remaining < 0 ? 0 : remaining;
  }

  async create(payload: {
    name?: string;
    username: string;
    password_hash: string;
    password_plain?: string;
    role?: UserRole;
  }): Promise<User> {
    const createdUser = new this.userModel({
      name: payload.name ?? payload.username,
      username: payload.username,
      password_hash: payload.password_hash,
      password_plain: payload.password_plain ?? "",

      role: payload.role ?? UserRole.USER,
      status: UserStatus.PENDING,

      total_seconds: 0,
      remaining_seconds: 0,
      started_at: null,

      start_date: new Date(),

      // ✅ ของเดิม
      device_id: null,

      // ✅ NEW
      devices: [],
    });

    return createdUser.save();
  }

  /**
   * ✅ สร้าง USER โดยแอดมิน
   * - Admin สร้างคนอื่น → ต้องเป็น USER เสมอ ✅
   */
  async createByAdmin(createUserDto: CreateUserByAdminDto): Promise<User> {
    const existingUser = await this.findByUsername(createUserDto.username);
    if (existingUser) {
      throw new ConflictException("Username already exists");
    }

    const saltRounds = Number(
      this.configService.get<string>("BCRYPT_SALT_ROUNDS")
    );

    if (!saltRounds || Number.isNaN(saltRounds)) {
      throw new Error("BCRYPT_SALT_ROUNDS is invalid");
    }

    const password_hash = await bcrypt.hash(createUserDto.password, saltRounds);

    const newUser = new this.userModel({
      name: createUserDto.name,
      username: createUserDto.username,
      password_hash,
      password_plain: createUserDto.password,

      role: UserRole.USER,

      status: UserStatus.PENDING,
      total_seconds: 0,
      remaining_seconds: 0,

      start_date: new Date(),
      started_at: null,

      // ✅ ของเดิม
      device_id: null,

      // ✅ NEW
      devices: [],
    });

    return newUser.save();
  }

  /**
   * ✅ สร้าง ADMIN (ใช้เฉพาะ seed admin เท่านั้น)
   */
  async createAdmin(payload: {
    name: string;
    username: string;
    password: string;
  }): Promise<User> {
    const existingUser = await this.findByUsername(payload.username);
    if (existingUser) {
      throw new ConflictException("Username already exists");
    }

    const saltRounds = Number(
      this.configService.get<string>("BCRYPT_SALT_ROUNDS")
    );

    if (!saltRounds || Number.isNaN(saltRounds)) {
      throw new Error("BCRYPT_SALT_ROUNDS is invalid");
    }

    const password_hash = await bcrypt.hash(payload.password, saltRounds);

    const newAdmin = new this.userModel({
      name: payload.name,
      username: payload.username,
      password_hash,
      password_plain: payload.password,

      role: UserRole.ADMIN,

      status: UserStatus.PENDING,
      total_seconds: 0,
      remaining_seconds: 0,

      start_date: new Date(),
      started_at: null,

      // ✅ ของเดิม
      device_id: null,

      // ✅ NEW
      devices: [],
    });

    return newAdmin.save();
  }

  /**
   * ✅ เติมเวลาให้ user (ของเดิม)
   */
  async addTime(
    userId: string,
    duration: keyof typeof this.durationMap,
    startTime?: string
  ) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    const secondsToAdd = this.durationMap[duration];
    if (!secondsToAdd) throw new BadRequestException("Invalid duration");

    const update: any = {
      $inc: {
        total_seconds: secondsToAdd,
        remaining_seconds: secondsToAdd,
      },
    };

    if (startTime) {
      const date = new Date(startTime);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException("Invalid start_time format");
      }

      // ✅ FIX: ของเดิมคุณ set timer_started_at แต่ schema ใช้ started_at
      update.$set = {
        started_at: date,
      };
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .exec();

    return updated;
  }

  /**
   * ✅ NEW: Assign หลายเครื่อง + เพิ่มเวลา per-device ในคำขอเดียว
   */
 async assignDevices(
  userId: string,
  items: { device_id: string; assign_seconds?: number }[],
  deviceService: any
) {
  const user: any = await this.findById(userId);
  if (!user) throw new NotFoundException("User not found");

  if (!Array.isArray(items)) {
    throw new BadRequestException("items must be an array");
  }

  // 🔴 device เดิมของ user
  const oldDevices = Array.isArray(user.devices) ? user.devices : [];

  // 🔴 validate device exists + availability
  for (const item of items) {
    if (!item.device_id) {
      throw new BadRequestException("device_id is required");
    }

    const device = await deviceService.findOne(item.device_id);
    if (!device) {
      throw new NotFoundException(`Device not found: ${item.device_id}`);
    }

    // ✔ อนุญาตถ้าเป็น device เดิมของ user
    const alreadyAssignedToUser = oldDevices.some(
      (d: any) => d.device_id === item.device_id
    );

    if (
      device.status !== DeviceStatus.AVAILABLE &&
      !alreadyAssignedToUser
    ) {
      throw new ConflictException(
        `Device ${device.name || item.device_id} is not available`
      );
    }

    // ✔ ห้ามซ้ำกับ user คนอื่น
    const assignedUser = await this.userModel.findOne({
      _id: { $ne: userId },
      "devices.device_id": item.device_id,
    });

    if (assignedUser) {
      throw new ConflictException(
        `Device ${device.name || item.device_id} is already assigned`
      );
    }
  }

  // 🔴 map device ใหม่
  const newDeviceIds = new Set(items.map(i => i.device_id));

  // 🔴 หา device ที่ถูกลบ
  const removedDevices = oldDevices.filter(
    (d: any) => !newDeviceIds.has(d.device_id)
  );

  // 🔴 สร้าง device list ใหม่ (replace logic)
  const updatedDevices = items.map(item => {
    const seconds = Math.max(0, Number(item.assign_seconds ?? 0));

    return {
      device_id: item.device_id,
      total_seconds: seconds,
      remaining_seconds: seconds,
      started_at: null,
      status: UserStatus.PENDING,
    };
  });

  // 🔴 replace devices ทั้งชุด
  user.devices = updatedDevices;

  // 🔴 อัปเดต device_history (จำนวนครั้งที่ user ใช้เครื่องนี้) เพื่อให้ตัวเลข "ใช้ X ครั้ง" ขึ้นตาม
  const history = Array.isArray(user.device_history) ? user.device_history : [];
  const now = new Date();
  for (const item of items) {
    const devId = String(item.device_id).trim();
    if (!devId) continue;
    const existing = history.find((h: any) => String(h.device_id) === devId);
    if (existing) {
      existing.use_count = (existing.use_count ?? 0) + 1;
      existing.last_used_at = now;
    } else {
      history.push({
        device_id: devId,
        last_used_at: now,
        use_count: 1,
      });
    }
  }
  user.device_history = history;

  await user.save();

  // 🔴 log device removed
  for (const d of removedDevices) {
    await this.logService.createLog({
      type: "DEVICE_DISCONNECTED",
      level: "INFO",
      message: "ลบการมอบหมายอุปกรณ์ออกจากผู้ใช้",
      target_user_id: userId,
      target_device_id: d.device_id,
      meta: { reason: "unassigned" }
    });
  }

  // 🔴 log device assigned/updated
  for (const item of items) {
    await this.logService.createLog({
      type: "DEVICE_ASSIGNED",
      level: "SUCCESS",
      message: "มอบหมายอุปกรณ์ให้ผู้ใช้สำเร็จ",
      target_user_id: userId,
      target_device_id: item.device_id,
      meta: { assign_seconds: item.assign_seconds }
    });
  }

  return {
    message: "Assigned devices successfully",
    userId,
    devices: user.devices,
  };
}

  /**
   * ✅ NEW: เพิ่มเวลาให้ user ที่กำลังใช้งานทั้งหมด (INUSE) ทีเดียว
   * - custom seconds ได้
   * - note หมายเหตุ (ส่งไปใน notification ให้ user)
   */
  async bulkAddTimeToInuseUsers(addSeconds: number, note?: string) {
  const seconds = Number(addSeconds) || 0;

  if (seconds <= 0) {
    throw new BadRequestException("add_seconds must be > 0");
  }

  // ⭐ หา user ที่กำลังใช้งาน
  const users = await this.userModel
    .find({ status: UserStatus.INUSE })
    .exec();

  const updatedUsers: any[] = [];

  for (const u of users) {
    let updated = false;

    const devices = Array.isArray(u.devices) ? u.devices : [];

    // ⭐ เพิ่มเวลาให้ทุก device ที่มี remaining
    for (const d of devices) {
      if ((d.remaining_seconds ?? 0) > 0) {
        d.total_seconds = Number(d.total_seconds ?? 0) + seconds;
        d.remaining_seconds = Number(d.remaining_seconds ?? 0) + seconds;
        updated = true;
      }
    }

    // ⭐ sync session (สำคัญมาก)
    await this.sessionsService.addTimeToActiveSessions(
      u._id.toString(),
      seconds
    );

    if (updated) {
      await u.save();
      updatedUsers.push({ user: u, note });
    }
  }

  // ⭐ log ระบบ
  await this.logService.createLog({
    type: "TIME_ADDED",
    level: "INFO",
    message: `เติมเวลาให้ผู้ใช้ที่กำลังใช้งานทั้งหมด (+${seconds}s)${note ? ` หมายเหตุ: ${note}` : ""}`,
    meta: { count: updatedUsers.length, added_seconds: seconds, note: note || null },
  });

  // ⭐ RETURN ARRAY → Controller ใช้ส่ง notification พร้อม note
  return updatedUsers;
}

  // users.service.ts

  async findAll(): Promise<any[]> {
    const users = await this.userModel.find().exec();
    return users.map((u: any) => {
      const updatedDevices = (u.devices || []).map((d: any) => {
        let currentRem = d.remaining_seconds ?? 0;

        if (d.started_at && u.status === UserStatus.INUSE && d.status === UserStatus.INUSE) {
          const elapsed = Math.floor((Date.now() - new Date(d.started_at).getTime()) / 1000);
          currentRem = Math.max(0, d.remaining_seconds - elapsed);
        }
        return {
          ...d,
          device_id: d.device_id.toString(),
          remaining_seconds: currentRem,
        };
      });

      return {
        id: u._id.toString(),
        name: u.name,
        username: u.username,
        status: u.status,
        devices: updatedDevices,
        device_history: u.device_history || [],
        password_plain: u.password_plain,
      };
    });
  }

  async findByUsername(username: string) {
    return this.userModel.findOne({ username });
  }

  async findById(userId: string): Promise<User | null> {
    return this.userModel.findById(userId).exec();
  }

  async update(userId: string, updateUserDto: any): Promise<User | null> {
    if (updateUserDto.password) {
      const saltRounds = Number(
        this.configService.get<string>("BCRYPT_SALT_ROUNDS")
      );

      if (!saltRounds || Number.isNaN(saltRounds)) {
        throw new Error("BCRYPT_SALT_ROUNDS is invalid");
      }

      updateUserDto.password_hash = await bcrypt.hash(
        updateUserDto.password,
        saltRounds
      );

      updateUserDto.password_plain = updateUserDto.password;

      delete updateUserDto.password;
    }

    return this.userModel
      .findByIdAndUpdate(userId, updateUserDto, { new: true })
      .exec();
  }

  /**
   * ✅ connectDevice (เดิม) ยังใช้ได้
   * - แต่ยังผูก device_id เดียวอยู่ (เพื่อไม่พังระบบเดิม)
   */
  async connectDevice(
    userId: string,
    deviceId: string,
    deviceService: any
  ): Promise<User> {
    const user: any = await this.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    const device = await deviceService.findOne(deviceId);
    if (!device) throw new NotFoundException("Device not found");

    if (device.current_user_id && device.current_user_id !== userId) {
      throw new BadRequestException("Device is already in use by another user");
    }

    if (user.device_id && user.device_id.toString() !== deviceId) {
      throw new BadRequestException("User is already connected to another device");
    }

    const shouldStart = user.remaining_seconds > 0 && user.started_at == null;

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          status: UserStatus.INUSE,
          device_id: deviceId,
          ...(shouldStart ? { started_at: new Date() } : {}),
        },
        { new: true }
      )
      .exec();

    await deviceService.update(deviceId, {
      current_user_id: userId,
      status: DeviceStatus.BUSY,
    });

    return updatedUser as any;
  }

  /**
   * ✅ disconnectDevice (เดิม) ยังใช้ได้
   */
  async disconnectDevice(userId: string, deviceService: any): Promise<User> {
    const user: any = await this.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    if (!user.device_id) {
      throw new BadRequestException("User is not connected to any device");
    }

    const realtimeRemaining = this.calcRemaining(user);

    const oldDeviceId = user.device_id;

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          status: UserStatus.PENDING,
          device_id: null,
          remaining_seconds: realtimeRemaining,
          started_at: null,
        },
        { new: true }
      )
      .exec();

    await deviceService.update(oldDeviceId.toString(), {
      current_user_id: null,
      status: DeviceStatus.AVAILABLE,
    });

    return updatedUser as any;
  }

  async delete(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId).exec();
  }
}
