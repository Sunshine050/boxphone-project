import {
  Controller,
  Get,
  Post,
  UseGuards,
  Delete,
  Param,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { DevicesService } from "../devices/devices.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "./user.schema";
import { CreateUserByAdminDto } from "./dto/create-user-by-admin.dto";
import { ConnectDeviceDto } from "./dto/connect-device.dto";
import { AddTimeDto } from "./dto/add-time.dto";

// ✅ NEW DTOs
import { AssignDevicesDto } from "./dto/assign-devices.dto";
import { BulkAddTimeDto } from "./dto/bulk-add-time.dto";
import { LogService } from "../log/log.service";
import { NotificationService } from "../notification/notification.service";

@Controller("users")
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly devicesService: DevicesService,
    private readonly logService: LogService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * ✅ สร้าง User ใหม่โดยแอดมิน
   * POST /users
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUserDto: CreateUserByAdminDto,
    @CurrentUser() currentUser: any,
  ) {
    this.logger.log(
      `[CREATE_USER] Admin: ${currentUser?.username || "unknown"} creating user: ${
        createUserDto.username
      }`,
    );

    try {
      const user = await this.usersService.createByAdmin(createUserDto);
      const userId = (user as any)._id.toString();

      this.logger.log(
        `[CREATE_USER] ✅ Success - User ID: ${userId}, Username: ${user.username}`,
      );

      await this.logService.createLog({
        type: "USER_CREATED",
        level: "SUCCESS",
        message: `สร้างผู้ใช้ใหม่: ${user.username}`,
        target_user_id: userId,
        admin_username: currentUser?.username || "admin",
        meta: { role: user.role },
      });

      return {
        message: "User created successfully",
        user: {
          id: userId,
          username: user.username,
          role: user.role,
          status: user.status,
          start_date: user.start_date,

          // ✅ ของเดิม
          device_id: (user as any).device_id ?? null,

          // ✅ NEW
          devices: (user as any).devices ?? [],

          // ✅ เวลาแทน credits
          total_seconds: (user as any).total_seconds,
          remaining_seconds: (user as any).remaining_seconds,
        },
      };
    } catch (error) {
      this.logger.error(
        `[CREATE_USER] ❌ Failed - Username: ${createUserDto.username}, Error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * ✅ ดึง user list (Admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * ✅ เติมเวลาให้ user (เดิม)
   * POST /users/:id/add-time
   */
  @Post(":id/add-time")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addTime(@Param("id") id: string, @Body() dto: AddTimeDto) {
    const result = await this.usersService.addTime(
      id,
      dto.duration,
      dto.start_time,
    );

    await this.notificationService.createAndSend(
      id,
      "TIME_ADDED",
      `ผู้ดูแลเพิ่มเวลาให้คุณ ${Math.floor(Number(dto.duration) / 60)} นาที`,
      "SUCCESS",
    );

    return result;
  }

  /**
   * ✅ NEW: assign device หลายเครื่อง + เวลา per-device ในคำขอเดียว
   * POST /users/:id/assign-devices
   */
  @Post(":id/assign-devices")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @HttpCode(HttpStatus.OK)
  async assignDevices(
    @Param("id") userId: string,
    @Body() dto: AssignDevicesDto,
    @CurrentUser() currentUser: any,
  ) {
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isSelfAction = currentUser?.id === userId;
    if (!isAdmin && !isSelfAction) {
      throw new ForbiddenException(
        "You can only assign devices to your own account",
      );
    }

    this.logger.log(
      `[ASSIGN_DEVICES] User: ${currentUser?.username || "unknown"} assigning ${
        dto?.items?.length || 0
      } devices to userId=${userId}`,
    );
    await this.logService.createLog({
      type: "DEVICE_ASSIGNED",
      level: "SUCCESS",
      message: `Assign อุปกรณ์ใหม่ ${dto.items.length} เครื่อง ให้ผู้ใช้`,
      target_user_id: userId,
      admin_username: currentUser?.username || "admin",
      meta: { devices: dto.items },
    });

    return this.usersService.assignDevices(
      userId,
      dto.items,
      this.devicesService,
    );
  }

  /**
   * ✅ NEW: เพิ่มเวลาให้ผู้ใช้ทุกคนที่กำลังใช้งาน (INUSE) ทีเดียว
   * POST /users/bulk-add-time
   */
  @Post("bulk-add-time")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async bulkAddTime(
    @Body() dto: BulkAddTimeDto,
    @CurrentUser() currentUser: any,
  ) {
    const seconds = Number(dto.add_seconds) || 0;
    const note = typeof dto.note === "string" ? dto.note.trim() : undefined;

    this.logger.log(
      `[BULK_ADD_TIME] Admin: ${currentUser?.username || "unknown"} adding ${seconds}s${note ? `, note: ${note}` : ""}`,
    );

    const result = await this.usersService.bulkAddTimeToInuseUsers(
      seconds,
      note,
    );

    const baseMessage = `ผู้ดูแลเพิ่มเวลาให้คุณ ${Math.floor(seconds / 60)} นาที`;
    const message = note ? `${baseMessage}\nหมายเหตุ: ${note}` : baseMessage;

    for (const item of result) {
      const u = item.user;
      await this.notificationService.createAndSend(
        u._id.toString(),
        "TIME_ADDED",
        message,
        "SUCCESS",
      );
    }

    return {
      message: "Bulk time added successfully",
      count: result.length,
      add_seconds: seconds,
      note: note ?? null,
    };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user) {
    return user;
  }

  /**
   * ✅ ดู user คนเดียว
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param("id") id: string) {
    const user: any = await this.usersService.findById(id);
    if (!user) throw new NotFoundException("User not found");

    return {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      status: user.status,
      start_date: user.start_date,

      // ✅ ของเดิม
      device_id: user.device_id ?? null,

      // ✅ NEW
      devices: user.devices ?? [],

      // ✅ เวลา
      total_seconds: user.total_seconds,
      remaining_seconds: user.remaining_seconds,

      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * ✅ ลบ user
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param("id") id: string) {
    await this.usersService.delete(id);
    return { message: "User deleted successfully" };
  }

  /**
   * ✅ เชื่อม User กับ Device (ของเดิม)
   */
  @Post(":id/connect-device")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async connectDevice(
    @Param("id") userId: string,
    @Body() connectDeviceDto: ConnectDeviceDto,
    @CurrentUser() currentUser: any,
  ) {
    this.logger.log(
      `[CONNECT_DEVICE] Admin: ${currentUser?.username || "unknown"} connecting User ID: ${userId} to Device ID: ${connectDeviceDto.device_id}`,
    );

    try {
      const user: any = await this.usersService.connectDevice(
        userId,
        connectDeviceDto.device_id,
        this.devicesService,
      );

      const userIdStr = user._id.toString();

      this.logger.log(
        `[CONNECT_DEVICE] ✅ Success - User ID: ${userIdStr}, Device ID: ${connectDeviceDto.device_id}, Status: ${user.status}`,
      );

      return {
        message: "User connected to device successfully",
        user: {
          id: userIdStr,
          username: user.username,
          status: user.status,
          device_id: user.device_id,
        },
      };
    } catch (error) {
      this.logger.error(
        `[CONNECT_DEVICE] ❌ Failed - User ID: ${userId}, Device ID: ${connectDeviceDto.device_id}, Error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * ✅ ยกเลิกการเชื่อม User กับ Device (ของเดิม)
   */
  @Post(":id/disconnect-device")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async disconnectDevice(@Param("id") userId: string) {
    const user: any = await this.usersService.disconnectDevice(
      userId,
      this.devicesService,
    );

    return {
      message: "User disconnected from device successfully",
      user: {
        id: user._id.toString(),
        username: user.username,
        status: user.status,
        device_id: user.device_id,
      },
    };
  }

  /**
   * ✅ update user (ยังคงไว้)
   */
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param("id") id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }
}
