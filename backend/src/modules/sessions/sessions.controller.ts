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
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { SessionsService } from "./sessions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../users/user.schema";
import { CreateSessionDto } from "./dto/create-session.dto";
import { MoveSessionDto } from "./dto/move-session.dto";
import { ReduceTimeDto } from "./dto/reduce-time.dto";
import { LogService } from "../log/log.service";
import { NotificationService } from "../notification/notification.service";

@Controller("sessions")
@UseGuards(JwtAuthGuard)
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly logService: LogService,
    private readonly notificationService: NotificationService
  ) { }
  /**
   * USER: ดึง session ของตัวเอง
   * GET /sessions/me
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMySessions(@CurrentUser() user: any) {
    const userId = user.userId || user.id;

    // 1. ตรวจสอบ Session ที่ Active อยู่แล้ว (ป้องกันการสร้างซ้ำเมื่อ Refresh)
    const activeSessions = await this.sessionsService.getActiveSessionsByUser(userId);
    if (activeSessions.length > 0) {
      return activeSessions;
    }

    // 2. ถ้าไม่มี Active Session ให้ลองตรวจสอบ Device ที่ถูก Assign ไว้และ Auto-Start
    return this.sessionsService.startAssignedSessionsByUser(userId);
  }


  /**
   * สร้าง Session ใหม่
   * POST /sessions
   * เมื่อลูกค้าจ่ายเงินและเริ่มใช้งาน
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createSessionDto: CreateSessionDto,
    @CurrentUser() currentUser: any
  ) {
    this.logger.log(
      `[CREATE_SESSION] Admin: ${currentUser?.username || "unknown"} creating session - User ID: ${createSessionDto.user_id}, Device ID: ${createSessionDto.device_id}, Package: ${createSessionDto.package}, Total Seconds: ${createSessionDto.total_seconds}`
    );
    try {
      const session =
        await this.sessionsService.createSession(createSessionDto);
      const sessionId = (session as any)._id.toString();
      this.logger.log(
        `[CREATE_SESSION] ✅ Success - Session ID: ${sessionId}, User ID: ${session.user_id}, Device ID: ${session.device_id}, Status: ${session.status}, Remaining: ${session.remaining_seconds}s`
      );
      await this.logService.createLog({
        type: 'TIME_ADDED',
        level: 'SUCCESS',
        message: `สร้าง Session ใหม่ (เครื่อง ${createSessionDto.device_id})`,
        target_user_id: createSessionDto.user_id,
        target_device_id: createSessionDto.device_id,
        admin_username: currentUser?.username || 'admin',
        meta: { package: createSessionDto.package, seconds: createSessionDto.total_seconds }
      });
      return {
        message: "Session created successfully",
        session: {
          id: sessionId,
          user_id: session.user_id,
          device_id: session.device_id,
          package: session.package,
          total_seconds: session.total_seconds,
          remaining_seconds: session.remaining_seconds,
          status: session.status,
          start_time: session.start_time,
        },
      };
    } catch (error) {
      this.logger.error(
        `[CREATE_SESSION] ❌ Failed - User ID: ${createSessionDto.user_id}, Device ID: ${createSessionDto.device_id}, Error: ${error.message}`
      );
      throw error;
    }
  }


  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.sessionsService.findAll();
  }


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


  @Get("device/:deviceId")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getActiveSessionByDevice(@Param("deviceId") deviceId: string) {
    const session =
      await this.sessionsService.getActiveSessionByDevice(deviceId);
    return session;
  }


  @Get(":id/remaining")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getRemainingTime(@Param("id") id: string) {
    this.logger.debug(
      `[GET_REMAINING_TIME] Checking remaining time for Session ID: ${id}`
    );
    try {
      const remaining = await this.sessionsService.getRemainingTime(id);
      const formatted = this.formatTime(remaining);
      this.logger.log(
        `[GET_REMAINING_TIME] ✅ Session ID: ${id}, Remaining: ${remaining}s (${formatted})`
      );
      return {
        session_id: id,
        remaining_seconds: remaining,
        remaining_minutes: Math.floor(remaining / 60),
        remaining_hours: Math.floor(remaining / 3600),
        formatted: formatted,
      };
    } catch (error) {
      this.logger.error(
        `[GET_REMAINING_TIME] ❌ Failed - Session ID: ${id}, Error: ${error.message}`
      );
      throw error;
    }
  }


  @Post(":id/pause")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async pause(
    @Param("id") id: string,
    @Body() body?: { reason?: string },
    @CurrentUser() currentUser?: any
  ) {
    this.logger.log(
      `[PAUSE_SESSION] Admin: ${currentUser?.username || "unknown"} pausing Session ID: ${id}, Reason: ${body?.reason || "N/A"}`
    );


    try {
      const session = await this.sessionsService.pauseSession(id, body?.reason);
      const sessionId = (session as any)._id.toString();

      // 🔴 คืนเครื่องให้ AVAILABLE
      if (session.device_id) {
        await this.sessionsService["deviceModel"].findByIdAndUpdate(
          session.device_id,
          {
            status: "QUARANTINE",
            current_user_id: null,
            previous_user_id: (session as any).user_id?.toString() ?? null,
            last_user_disconnected_at: new Date(),
          }
        );
      }

      this.logger.log(
        `[PAUSE_SESSION] ✅ Success - Session ID: ${sessionId}, Status: ${session.status}, Remaining: ${session.remaining_seconds}s (FROZEN)`
      );

      await this.logService.createLog({
        type: "SESSION_ENDED",
        level: "INFO",
        message: `หยุดการใช้งานชั่วคราว (Pause Session)`,
        target_user_id: (session as any).user_id,
        target_device_id: (session as any).device_id,
        admin_username: currentUser?.username || "admin",
        meta: { reason: body?.reason || "manual pause" },
      });
      await this.notificationService.createAndSend(
        (session as any).user_id,
        "SESSION_PAUSED",
        `การใช้งานของคุณถูกหยุดชั่วคราวโดยผู้ดูแล`,
        "WARNING"
      );

      return {
        message: "Session paused successfully",
        session: {
          id: sessionId,
          status: session.status,
          remaining_seconds: session.remaining_seconds,
          pause_time: session.pause_time,
        },
      };
    } catch (error) {
      this.logger.error(
        `[PAUSE_SESSION] ❌ Failed - Session ID: ${id}, Error: ${error.message}`
      );
      throw error;
    }
  }


  @Post(":id/resume")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async resume(@Param("id") id: string, @CurrentUser() currentUser: any) {
    this.logger.log(
      `[RESUME_SESSION] Admin: ${currentUser?.username || "unknown"} resuming Session ID: ${id}`
    );
    try {
      const session = await this.sessionsService.resumeSession(id);
      const sessionId = (session as any)._id.toString();
      this.logger.log(
        `[RESUME_SESSION] ✅ Success - Session ID: ${sessionId}, Status: ${session.status}, Remaining: ${session.remaining_seconds}s`
      );
      await this.notificationService.createAndSend(
        (session as any).user_id,
        "SESSION_RESUMED",
        `การใช้งานของคุณถูกเริ่มต่อ`,
        "SUCCESS"
      );
      return {
        message: "Session resumed successfully",
        session: {
          id: sessionId,
          status: session.status,
          remaining_seconds: session.remaining_seconds,
          resume_time: session.resume_time,
        },
      };
    } catch (error) {
      this.logger.error(
        `[RESUME_SESSION] ❌ Failed - Session ID: ${id}, Error: ${error.message}`
      );
      throw error;
    }
  }


  @Post(":id/move")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async move(
    @Param("id") id: string,
    @Body() moveSessionDto: MoveSessionDto,
    @CurrentUser() currentUser: any
  ) {
    this.logger.log(
      `[MOVE_SESSION] Admin: ${currentUser?.username || "unknown"} moving Session ID: ${id} to Device ID: ${moveSessionDto.to_device_id}, Reason: ${moveSessionDto.reason || "N/A"}`
    );

    try {
      const movedBy =
        currentUser?.userId ||
        currentUser?.id ||
        currentUser?._id?.toString() ||
        "unknown";
      const session = await this.sessionsService.moveSession(
        id,
        moveSessionDto,
        movedBy
      );
      const sessionId = (session as any)._id.toString();
      this.logger.log(
        `[MOVE_SESSION] ✅ Success - Session ID: ${sessionId}, From Device: ${moveSessionDto.to_device_id}, To Device: ${session.device_id}, Remaining: ${session.remaining_seconds}s (UNCHANGED), Moved Count: ${session.moved_count}`
      );
      await this.logService.createLog({
        type: 'DEVICE_ASSIGNED',
        level: 'WARNING',
        message: `ย้ายผู้ใช้ไปเครื่องใหม่: ${moveSessionDto.to_device_id}`,
        target_user_id: (session as any).user_id,
        target_device_id: moveSessionDto.to_device_id,
        admin_username: currentUser?.username || 'admin',
        meta: { reason: moveSessionDto.reason }
      });
      await this.notificationService.createAndSend(
        (session as any).user_id,
        "DEVICE_MOVED",
        `คุณถูกย้ายไปอุปกรณ์ใหม่`,
        "INFO"
      );
      return {
        message: "Session moved successfully",
        session: {
          id: sessionId,
          device_id: session.device_id,
          remaining_seconds: session.remaining_seconds,
          status: session.status,
          moved_count: session.moved_count,
          resume_time: session.resume_time,
        },
      };
    } catch (error) {
      this.logger.error(
        `[MOVE_SESSION] ❌ Failed - Session ID: ${id}, To Device: ${moveSessionDto.to_device_id}, Error: ${error.message}`
      );
      throw error;
    }
  }


  @Post(":id/reduce-time")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reduceTime(
    @Param("id") id: string,
    @Body() dto: ReduceTimeDto,
    @CurrentUser() currentUser: any
  ) {
    this.logger.log(
      `[REDUCE_TIME] Admin: ${currentUser?.username || "unknown"} reducing ${dto.seconds}s from Session ID: ${id}`
    );

    const session = await this.sessionsService.reduceTimeFromSession(id, dto.seconds);

    await this.notificationService.createAndSend(
      (session as any).user_id?.toString(),
      "TIME_REDUCED",
      `ผู้ดูแลลดเวลาของคุณ ${Math.floor(dto.seconds / 60)} นาที ${dto.seconds % 60} วินาที`,
      "WARNING"
    );

    await this.logService.createLog({
      type: "SESSION_ENDED",
      level: "WARNING",
      message: `ลดเวลา Session (-${dto.seconds}s)`,
      target_user_id: (session as any).user_id?.toString(),
      target_device_id: (session as any).device_id?.toString(),
      admin_username: currentUser?.username || "admin",
      meta: { reduced_seconds: dto.seconds, remaining_seconds: session.remaining_seconds },
    });

    return {
      message: "Time reduced successfully",
      session: {
        id: (session as any)._id.toString(),
        remaining_seconds: session.remaining_seconds,
        status: session.status,
      },
    };
  }


  @Post(":id/cancel")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async cancel(@Param("id") id: string) {
    const session: any = await this.sessionsService.cancelSession(id);

    await this.notificationService.createAndSend(
      session.user_id,
      "SESSION_CANCELLED",
      `การใช้งานของคุณถูกยกเลิกโดยผู้ดูแล`,
      "DANGER"
    );

    return {
      message: "Session cancelled successfully",
      session: {
        id: session._id.toString(),
        status: session.status,
      },
    };
  }


  @Get(":id/move-logs")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMoveLogs(@Param("id") id: string) {
    return this.sessionsService.getMoveLogs(id);
  }


  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
}
