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
  private readonly logger = new Logger(SessionsController.name);

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
      this.logger.log(
        `[PAUSE_SESSION] ✅ Success - Session ID: ${sessionId}, Status: ${session.status}, Remaining: ${session.remaining_seconds}s (FROZEN)`
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
