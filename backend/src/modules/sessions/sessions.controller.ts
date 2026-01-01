import {
  Controller,
  Get,
  Post,
  UseGuards,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { SessionsService } from "./sessions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../users/user.schema";
import { CreateSessionDto } from "./dto/create-session.dto";
import { MoveSessionDto } from "./dto/move-session.dto";

@Controller("sessions")
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * สร้าง Session ใหม่
   * POST /sessions
   * เมื่อลูกค้าจ่ายเงินและเริ่มใช้งาน
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSessionDto: CreateSessionDto) {
    const session = await this.sessionsService.createSession(createSessionDto);
    return {
      message: "Session created successfully",
      session: {
        id: (session as any)._id.toString(),
        user_id: session.user_id,
        device_id: session.device_id,
        package: session.package,
        total_seconds: session.total_seconds,
        remaining_seconds: session.remaining_seconds,
        status: session.status,
        start_time: session.start_time,
      },
    };
  }

  /**
   * ดึง Session ทั้งหมด (Admin only)
   * GET /sessions
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.sessionsService.findAll();
  }

  /**
   * ดึง Session จาก ID
   * GET /sessions/:id
   */
  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param("id") id: string) {
    const session = await this.sessionsService.findById(id);
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    return session;
  }

  /**
   * ดึง Session ที่ active ของ User
   * GET /sessions/user/:userId
   */
  @Get("user/:userId")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getActiveSessionByUser(@Param("userId") userId: string) {
    const session = await this.sessionsService.getActiveSessionByUser(userId);
    if (!session) {
      throw new NotFoundException("No active session found for this user");
    }
    return session;
  }

  /**
   * ดึง Session ที่ active ของ Device
   * GET /sessions/device/:deviceId
   */
  @Get("device/:deviceId")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getActiveSessionByDevice(@Param("deviceId") deviceId: string) {
    const session = await this.sessionsService.getActiveSessionByDevice(deviceId);
    return session; // null ถ้าไม่มี
  }

  /**
   * ดูเวลาที่เหลือของ Session
   * GET /sessions/:id/remaining
   */
  @Get(":id/remaining")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getRemainingTime(@Param("id") id: string) {
    const remaining = await this.sessionsService.getRemainingTime(id);
    return {
      session_id: id,
      remaining_seconds: remaining,
      remaining_minutes: Math.floor(remaining / 60),
      remaining_hours: Math.floor(remaining / 3600),
      formatted: this.formatTime(remaining),
    };
  }

  /**
   * หยุด Session (เมื่อ disconnect)
   * POST /sessions/:id/pause
   */
  @Post(":id/pause")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async pause(
    @Param("id") id: string,
    @Body() body?: { reason?: string }
  ) {
    const session = await this.sessionsService.pauseSession(
      id,
      body?.reason
    );
    return {
      message: "Session paused successfully",
      session: {
        id: (session as any)._id.toString(),
        status: session.status,
        remaining_seconds: session.remaining_seconds,
        pause_time: session.pause_time,
      },
    };
  }

  /**
   * เริ่ม Session ต่อ (resume)
   * POST /sessions/:id/resume
   */
  @Post(":id/resume")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async resume(@Param("id") id: string) {
    const session = await this.sessionsService.resumeSession(id);
    return {
      message: "Session resumed successfully",
      session: {
        id: (session as any)._id.toString(),
        status: session.status,
        remaining_seconds: session.remaining_seconds,
        resume_time: session.resume_time,
      },
    };
  }

  /**
   * ย้าย Session ไปเครื่องอื่น
   * POST /sessions/:id/move
   * ฟีเจอร์หลัก: ย้ายสิทธิโดยไม่เสียเวลาแม้แต่วินาทีเดียว
   */
  @Post(":id/move")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async move(
    @Param("id") id: string,
    @Body() moveSessionDto: MoveSessionDto,
    @CurrentUser() currentUser: any
  ) {
    const session = await this.sessionsService.moveSession(
      id,
      moveSessionDto,
      currentUser.id || currentUser._id.toString()
    );
    return {
      message: "Session moved successfully",
      session: {
        id: (session as any)._id.toString(),
        device_id: session.device_id,
        remaining_seconds: session.remaining_seconds,
        status: session.status,
        moved_count: session.moved_count,
        resume_time: session.resume_time,
      },
    };
  }

  /**
   * ยกเลิก Session
   * POST /sessions/:id/cancel
   */
  @Post(":id/cancel")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async cancel(@Param("id") id: string) {
    const session = await this.sessionsService.cancelSession(id);
    return {
      message: "Session cancelled successfully",
      session: {
        id: (session as any)._id.toString(),
        status: session.status,
      },
    };
  }

  /**
   * ดึง Move Logs ของ Session
   * GET /sessions/:id/move-logs
   */
  @Get(":id/move-logs")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMoveLogs(@Param("id") id: string) {
    return this.sessionsService.getMoveLogs(id);
  }

  /**
   * Helper: Format time จาก seconds เป็น HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
}

