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
import { AssignDevicesDto } from "./dto/assign-devices.dto";
import { BulkAddTimeDto } from "./dto/bulk-add-time.dto";
import { LogService } from "../log/log.service";

@Controller("users")
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly devicesService: DevicesService,
    private readonly logService: LogService
  ) { }

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
    @CurrentUser() currentUser: any
  ) {
    const adminUsername = currentUser?.username || "unknown";
    this.logger.log(`[CREATE_USER] Admin: ${adminUsername} creating user: ${createUserDto.username}`);

    try {
      const user = await this.usersService.createByAdmin(createUserDto, adminUsername);
      this.logger.log(`[CREATE_USER] ✅ Success - User ID: ${user.id}, Username: ${user.username}`);
      return {
        message: "User created successfully",
        user,
      };
    } catch (error: any) {
      this.logger.error(`[CREATE_USER] ❌ Failed - Username: ${createUserDto.username}, Error: ${error.message}`);
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
    const result = await this.usersService.addTime(id, dto.duration, dto.start_time);

    return result;
  }

  /**
   * ✅ NEW: assign device หลายเครื่อง + เวลา per-device ในคำขอเดียว
   * POST /users/:id/assign-devices
   */
  @Post(":id/assign-devices")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignDevices(
    @Param("id") userId: string,
    @Body() dto: AssignDevicesDto,
    @CurrentUser() currentUser: any
  ) {
    const adminUsername = currentUser?.username || "unknown";
    this.logger.log(`[ASSIGN_DEVICES] Admin: ${adminUsername} assigning ${dto?.items?.length || 0} devices to userId=${userId}`);

    return this.usersService.assignDevices(
      userId,
      dto.items,
      this.devicesService,
      adminUsername
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
  async bulkAddTime(@Body() dto: BulkAddTimeDto, @CurrentUser() currentUser: any) {
    this.logger.log(
      `[BULK_ADD_TIME] Admin: ${currentUser?.username || "unknown"} adding ${dto.add_seconds}s to INUSE users`
    );
    await this.logService.createLog({
      type: 'TIME_ADDED',
      level: 'INFO',
      message: `เติมเวลาแบบกลุ่ม (Bulk) จำนวน ${dto.add_seconds} วินาที ให้ผู้ใช้ที่ INUSE`,
      admin_username: currentUser?.username || 'admin',
      meta: { seconds_added: dto.add_seconds }
    });

    return this.usersService.bulkAddTimeToInuseUsers(dto.add_seconds);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  /**
   * ✅ ดู user คนเดียว
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param("id") id: string) {
    return this.usersService.findByIdFormatted(id);
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
    @CurrentUser() currentUser: any
  ) {
    this.logger.log(`[CONNECT_DEVICE] Admin: ${currentUser?.username || "unknown"} connecting User ID: ${userId} to Device ID: ${connectDeviceDto.device_id}`);

    try {
      const user: any = await this.usersService.connectDevice(
        userId,
        connectDeviceDto.device_id,
        this.devicesService
      );

      const userIdStr = user._id.toString();
      this.logger.log(`[CONNECT_DEVICE] ✅ Success - User ID: ${userIdStr}, Device ID: ${connectDeviceDto.device_id}, Status: ${user.status}`);

      return {
        message: "User connected to device successfully",
        user: {
          id: userIdStr,
          username: user.username,
          status: user.status,
          device_id: user.device_id,
        },
      };
    } catch (error: any) {
      this.logger.error(`[CONNECT_DEVICE] ❌ Failed - User ID: ${userId}, Device ID: ${connectDeviceDto.device_id}, Error: ${error.message}`);
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
      this.devicesService
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
