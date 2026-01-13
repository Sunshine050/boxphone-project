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

@Controller("users")
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly devicesService: DevicesService
  ) {}

  /**
   * ✅ สร้าง User ใหม่โดยแอดมิน
   * POST /users
   * - รับแค่ username, password
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUserDto: CreateUserByAdminDto,
    @CurrentUser() currentUser: any
  ) {
    this.logger.log(
      `[CREATE_USER] Admin: ${currentUser?.username || "unknown"} creating user: ${createUserDto.username}`
    );

    try {
      const user = await this.usersService.createByAdmin(createUserDto);
      const userId = (user as any)._id.toString();

      this.logger.log(
        `[CREATE_USER] ✅ Success - User ID: ${userId}, Username: ${user.username}`
      );

      return {
        message: "User created successfully",
        user: {
          id: userId,
          username: user.username,
          role: user.role,
          status: user.status,
          start_date: user.start_date,
          device_id: user.device_id,

          // ✅ เวลาแทน credits
          total_seconds: (user as any).total_seconds,
          remaining_seconds: (user as any).remaining_seconds,

          // ✅ password สำหรับแสดงในหน้า admin
          password_plain: (user as any).password_plain,
        },
      };
    } catch (error) {
      this.logger.error(
        `[CREATE_USER] ❌ Failed - Username: ${createUserDto.username}, Error: ${error.message}`
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
   * ✅ เติมเวลาให้ user
   * POST /users/:id/add-time
   */
  @Post(":id/add-time")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addTime(@Param("id") id: string, @Body() dto: AddTimeDto) {
    return this.usersService.addTime(id, dto.duration, dto.start_time);
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
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: (user as any)._id.toString(),
      username: user.username,
      role: user.role,
      status: user.status,
      start_date: (user as any).start_date,
      device_id: user.device_id,

      // ✅ เวลา
      total_seconds: (user as any).total_seconds,
      remaining_seconds: (user as any).remaining_seconds,

      // ✅ password column
      password_plain: (user as any).password_plain,

      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
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
   * เชื่อม User กับ Device
   */
  @Post(":id/connect-device")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async connectDevice(
    @Param("id") userId: string,
    @Body() connectDeviceDto: ConnectDeviceDto,
    @CurrentUser() currentUser: any
  ) {
    this.logger.log(
      `[CONNECT_DEVICE] Admin: ${currentUser?.username || "unknown"} connecting User ID: ${userId} to Device ID: ${connectDeviceDto.device_id}`
    );

    try {
      const user = await this.usersService.connectDevice(
        userId,
        connectDeviceDto.device_id,
        this.devicesService
      );

      const userIdStr = (user as any)._id.toString();

      this.logger.log(
        `[CONNECT_DEVICE] ✅ Success - User ID: ${userIdStr}, Device ID: ${connectDeviceDto.device_id}, Status: ${user.status}`
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
        `[CONNECT_DEVICE] ❌ Failed - User ID: ${userId}, Device ID: ${connectDeviceDto.device_id}, Error: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * ยกเลิกการเชื่อม User กับ Device
   */
  @Post(":id/disconnect-device")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async disconnectDevice(@Param("id") userId: string) {
    const user = await this.usersService.disconnectDevice(
      userId,
      this.devicesService
    );

    return {
      message: "User disconnected from device successfully",
      user: {
        id: (user as any)._id.toString(),
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
