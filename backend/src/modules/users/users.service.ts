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
    "1h": 60 * 60,
    "1d": 60 * 60 * 24,
    "1w": 60 * 60 * 24 * 7,
    "1m": 60 * 60 * 24 * 30,
    "1y": 60 * 60 * 24 * 365,
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

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException("items is required");
    }

    // ✅ validate device exists
    for (const item of items) {
      if (!item.device_id) {
        throw new BadRequestException("device_id is required");
      }

      const device = await deviceService.findOne(item.device_id);
      if (!device) {
        throw new NotFoundException(`Device not found: ${item.device_id}`);
      }

      // ✅ NEW: device ต้อง AVAILABLE เท่านั้น
      if (device.status !== DeviceStatus.AVAILABLE) {
        throw new ConflictException(
          `Device ${device.name || item.device_id} is not available`
        );
      }

      // ✅ NEW: device ห้ามถูก assign ให้ user คนอื่น
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

    const devicesArr = Array.isArray(user.devices) ? user.devices : [];

    for (const item of items) {
      const seconds = Math.max(0, Number(item.assign_seconds ?? 0));

      const exists = devicesArr.find((d: any) => d.device_id === item.device_id);

      if (!exists) {
        devicesArr.push({
          device_id: item.device_id,
          total_seconds: seconds,
          remaining_seconds: seconds,
          started_at: null,
          status: UserStatus.PENDING,
        });
      } else {
        exists.total_seconds = seconds;
        exists.remaining_seconds = seconds;
        exists.started_at = null;
      }
    }

    user.devices = devicesArr;
    await user.save();
    for (const item of items) {
      await this.logService.createLog({
        type: 'DEVICE_ASSIGNED',
        level: 'SUCCESS',
        message: `มอบหมายอุปกรณ์ให้ผู้ใช้สำเร็จ`,
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
   */
  async bulkAddTimeToInuseUsers(addSeconds: number) {
    if (!addSeconds || addSeconds <= 0) {
      throw new BadRequestException("add_seconds must be > 0");
    }

    const users = await this.userModel.find({ status: UserStatus.INUSE }).exec();

    for (const u of users) {
      const devices = Array.isArray(u.devices) ? u.devices : [];

      for (const d of devices) {

        if (d.status === UserStatus.INUSE) {
          d.total_seconds = (d.total_seconds ?? 0) + addSeconds;
          d.remaining_seconds = (d.remaining_seconds ?? 0) + addSeconds;
        }
      }

      await u.save();

      await this.sessionsService.addTimeToActiveSessions(
        u._id.toString(),
        addSeconds
      );
    }

    await this.logService.createLog({
      type: "TIME_ADDED",
      level: "INFO",
      message: `เติมเวลาให้ผู้ใช้ที่กำลังใช้งานทั้งหมด (+ ${addSeconds} วินาที)`,
      meta: { count: users.length, added_seconds: addSeconds },
    });

    return {
      message: "Bulk add time success",
      count: users.length,
      add_seconds: addSeconds,
    };
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
