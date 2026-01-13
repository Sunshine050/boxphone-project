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

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly configService: ConfigService
  ) {}

  // ✅ map duration → seconds
  private durationMap = {
    "1h": 60 * 60,
    "1d": 60 * 60 * 24,
    "1w": 60 * 60 * 24 * 7,
    "1m": 60 * 60 * 24 * 30,
    "1y": 60 * 60 * 24 * 365,
  } as const;
 private calcRemaining(user: any) {
  const remainingDb = user.remaining_seconds ?? 0;
  const startedAt = user.started_at ? new Date(user.started_at) : null;

  if (!startedAt) return remainingDb;

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

      // ✅ ถ้าส่งมาก็เก็บ (optional)
      password_plain: payload.password_plain ?? "",

      role: payload.role ?? UserRole.USER,
      status: UserStatus.PENDING,

      total_seconds: 0,
      remaining_seconds: 0,

      // ✅ สำคัญ: ยังไม่เริ่มนับ
      started_at: null,

      start_date: new Date(),
      device_id: null,
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

      // ✅ FIX: admin สร้างคนอื่น ต้องเป็น USER เสมอ
      role: UserRole.USER,

      status: UserStatus.PENDING,
      total_seconds: 0,
      remaining_seconds: 0,

      start_date: new Date(),
      started_at: null,
      device_id: null,
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

      // ✅ FIX: seed admin ต้องเป็น ADMIN
      role: UserRole.ADMIN,

      status: UserStatus.PENDING,
      total_seconds: 0,
      remaining_seconds: 0,

      start_date: new Date(),
      started_at: null,
      device_id: null,
    });

    return newAdmin.save();
  }

  /**
   * ✅ เติมเวลาให้ user
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

    // ✅ ถ้ามี start_time → ตั้งเวลาเริ่มเดิน
    if (startTime) {
      const date = new Date(startTime);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException("Invalid start_time format");
      }

      update.$set = {
        timer_started_at: date,
      };
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .exec();

    return updated;
  }

  async findAll(): Promise<any[]> {
    const users = await this.userModel.find().exec();

    return users.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      username: u.username,
      role: u.role,
      status: u.status,
      device_id: u.device_id,

      total_seconds: u.total_seconds,
      remaining_seconds: this.calcRemaining(u), // ✅ realtime

      password_plain: u.password_plain,
      started_at: u.started_at,
    }));
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

  async connectDevice(
    userId: string,
    deviceId: string,
    deviceService: any
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const device = await deviceService.findOne(deviceId);
    if (!device) {
      throw new NotFoundException("Device not found");
    }

    if (device.current_user_id && device.current_user_id !== userId) {
      throw new BadRequestException("Device is already in use by another user");
    }

    if (user.device_id && user.device_id.toString() !== deviceId) {
      throw new BadRequestException(
        "User is already connected to another device"
      );
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

    return updatedUser;
  }

  async disconnectDevice(userId: string, deviceService: any): Promise<User> {
    const user: any = await this.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    if (!user.device_id)
      throw new BadRequestException("User is not connected to any device");

    const realtimeRemaining = this.calcRemaining(user); // ✅ เอาเวลาที่เหลือจริง

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          status: UserStatus.PENDING,
          device_id: null,

          remaining_seconds: realtimeRemaining, // ✅ เก็บกลับลง DB
          started_at: null, // ✅ reset ไม่ให้นับต่อ
        },
        { new: true }
      )
      .exec();

    await deviceService.update(user.device_id.toString(), {
      current_user_id: null,
      status: DeviceStatus.AVAILABLE,
    });

    return updatedUser;
  }

  async delete(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId).exec();
  }
}
