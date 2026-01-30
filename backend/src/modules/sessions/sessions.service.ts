import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { Session, SessionDocument, SessionStatus } from "./session.schema";
import {
  SessionMoveLog,
  SessionMoveLogDocument,
} from "./session-move-log.schema";
import { CreateSessionDto } from "./dto/create-session.dto";
import { MoveSessionDto } from "./dto/move-session.dto";
import { User, UserDocument, UserStatus } from "../users/user.schema";
import { Device, DeviceDocument, DeviceStatus } from "../devices/device.schema";

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Device.name)
    private deviceModel: Model<DeviceDocument>,

    @InjectModel(SessionMoveLog.name)
    private sessionMoveLogModel: Model<SessionMoveLogDocument>,
    private readonly configService: ConfigService
  ) { }

  /**
   * สร้าง Session ใหม่
   * เมื่อลูกค้าจ่ายเงินและเริ่มใช้งาน
   */
  async createSession(createSessionDto: CreateSessionDto): Promise<Session> {
    // เช็คว่า user มี session ที่ active อยู่แล้วหรือไม่
    const existingSession = await this.sessionModel.findOne({
      user_id: createSessionDto.user_id,
      status: {
        $in: [
          SessionStatus.ACTIVE,
          SessionStatus.PAUSED,
          SessionStatus.DISCONNECTED,
        ],
      },
    });

    if (existingSession) {
      throw new ConflictException(
        "User already has an active session. Please complete or cancel the existing session first."
      );
    }

    // เช็คว่า device ว่างอยู่หรือไม่
    const deviceSession = await this.sessionModel.findOne({
      device_id: createSessionDto.device_id,
      status: { $in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] },
    });

    if (deviceSession) {
      throw new ConflictException(
        "Device is already in use by another session"
      );
    }

    const maxMoveCount = this.configService.get<number>("SESSION_MAX_MOVE_COUNT");
    if (maxMoveCount === undefined) {
      throw new Error("SESSION_MAX_MOVE_COUNT is not configured");
    }

    const newSession = new this.sessionModel({
      user_id: createSessionDto.user_id,
      device_id: createSessionDto.device_id,
      package: createSessionDto.package,
      total_seconds: createSessionDto.total_seconds,
      remaining_seconds: createSessionDto.total_seconds,
      status: SessionStatus.ACTIVE,
      start_time: new Date(),
      pause_time: null,
      resume_time: null,
      moved_count: 0,
      max_move_count: maxMoveCount,
      disconnect_reason: null,
    });

    return newSession.save();
  }

  /**
   * หยุด Session (เมื่อ disconnect)
   * - Freeze remaining_seconds
   * - เปลี่ยน status เป็น DISCONNECTED หรือ PAUSED
   */
  async pauseSession(sessionId: string, reason?: string): Promise<Session> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException("Session not found");
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot pause session with status: ${session.status}`
      );
    }

    // Freeze remaining_seconds - คำนวณเวลาที่เหลือจริงๆ
    const now = new Date();
    const lastResumeTime = session.resume_time || session.start_time;
    const elapsedSeconds = Math.floor(
      (now.getTime() - lastResumeTime.getTime()) / 1000
    );
    const actualRemaining = Math.max(
      0,
      session.remaining_seconds - elapsedSeconds
    );

    const updatedSession = await this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        status: SessionStatus.DISCONNECTED,
        remaining_seconds: actualRemaining,
        pause_time: now,
        disconnect_reason:
          reason ||
          this.configService.get<string>("SESSION_DEFAULT_DISCONNECT_REASON"),
      },
      { new: true }
    );

    return updatedSession;
  }

  /**
   * เริ่ม Session ต่อ (resume)
   * - ใช้ remaining_seconds เดิม (ไม่ reset)
   * - เปลี่ยน status เป็น ACTIVE
   */
  async resumeSession(sessionId: string): Promise<Session> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException("Session not found");
    }

    if (
      session.status !== SessionStatus.PAUSED &&
      session.status !== SessionStatus.DISCONNECTED
    ) {
      throw new BadRequestException(
        `Cannot resume session with status: ${session.status}`
      );
    }

    if (session.remaining_seconds <= 0) {
      throw new BadRequestException("Session has no remaining time");
    }

    const updatedSession = await this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        status: SessionStatus.ACTIVE,
        resume_time: new Date(),
        disconnect_reason: null,
      },
      { new: true }
    );

    return updatedSession;
  }

  /**
   * ย้าย Session ไปเครื่องอื่น
   * - Detach จากเครื่องเก่า
   * - Attach กับเครื่องใหม่
   * - remaining_seconds ไม่เปลี่ยน (freeze)
   * - Log การย้าย
   */
  async moveSession(
    sessionId: string,
    moveSessionDto: MoveSessionDto,
    movedByUserId: string
  ): Promise<Session> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException("Session not found");
    }

    // เช็คว่า session สามารถย้ายได้หรือไม่
    if (
      session.status !== SessionStatus.DISCONNECTED &&
      session.status !== SessionStatus.PAUSED
    ) {
      throw new BadRequestException(
        `Cannot move session with status: ${session.status}. Session must be DISCONNECTED or PAUSED.`
      );
    }

    // เช็คว่าย้ายเกินจำนวนครั้งที่กำหนดหรือไม่
    if (session.moved_count >= session.max_move_count) {
      throw new BadRequestException(
        `Maximum move count (${session.max_move_count}) reached for this session`
      );
    }

    // เช็คว่า device ใหม่ว่างอยู่หรือไม่
    const deviceSession = await this.sessionModel.findOne({
      device_id: moveSessionDto.to_device_id,
      status: { $in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] },
    });

    if (deviceSession) {
      throw new ConflictException("Target device is already in use");
    }

    // Freeze remaining_seconds ก่อนย้าย
    // Session ที่จะย้ายได้ต้องเป็น PAUSED หรือ DISCONNECTED แล้ว
    // ซึ่ง remaining_seconds ถูก freeze ไว้แล้วจาก pauseSession()
    // ดังนั้นใช้ remaining_seconds ที่ freeze ไว้เลย
    const actualRemaining = session.remaining_seconds;

    // Detach จากเครื่องเก่า และ Attach กับเครื่องใหม่
    const updatedSession = await this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        device_id: moveSessionDto.to_device_id,
        remaining_seconds: actualRemaining,
        status: SessionStatus.ACTIVE, // เปลี่ยนเป็น ACTIVE เพื่อพร้อมใช้งาน
        resume_time: new Date(), // เริ่มนับใหม่
        moved_count: session.moved_count + 1,
        disconnect_reason: null,
      },
      { new: true }
    );

    // Log การย้าย
    await this.sessionMoveLogModel.create({
      session_id: sessionId,
      from_device_id: session.device_id,
      to_device_id: moveSessionDto.to_device_id,
      remaining_seconds: actualRemaining,
      moved_by: movedByUserId,
      reason: moveSessionDto.reason || null,
    });

    return updatedSession;
  }

  /**
   * ดึง Session ที่ active ของ User
   */
  async getActiveSessionByUser(userId: string): Promise<Session | null> {
    return this.sessionModel
      .findOne({
        user_id: userId,
        status: {
          $in: [
            SessionStatus.ACTIVE,
            SessionStatus.PAUSED,
            SessionStatus.DISCONNECTED,
          ],
        },
      })
      .populate("device_id")
      .exec();
  }

  async getActiveSessionsByUser(userId: string): Promise<Session[]> {
    if (!userId) {
      return [];
    }

    return this.sessionModel
      .find({
        user_id: userId,
        status: {
          $in: [
            SessionStatus.ACTIVE,
            SessionStatus.PAUSED,
            SessionStatus.DISCONNECTED,
          ],
        },
      })
      .populate("device_id")
      .exec();
  }


  /**
   * ดึง Session ที่ active ของ Device
   */
  async getActiveSessionByDevice(deviceId: string): Promise<Session | null> {
    return this.sessionModel
      .findOne({
        device_id: deviceId,
        status: { $in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] },
      })
      .populate("user_id")
      .exec();
  }

  /**
   * ดึง Session จาก ID
   */
  async findById(sessionId: string): Promise<Session | null> {
    return this.sessionModel
      .findById(sessionId)
      .populate("user_id")
      .populate("device_id")
      .exec();
  }

  /**
   * คำนวณเวลาที่เหลือจริงๆ (สำหรับ session ที่ active)
   */
  async getRemainingTime(sessionId: string): Promise<number> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException("Session not found");
    }

    // ถ้า session ไม่ได้ active ให้ return remaining_seconds ที่ freeze ไว้
    if (session.status !== SessionStatus.ACTIVE) {
      return session.remaining_seconds;
    }

    // ถ้า active ให้คำนวณเวลาจริงๆ
    const now = new Date();
    const lastResumeTime = session.resume_time || session.start_time;
    const elapsedSeconds = Math.floor(
      (now.getTime() - lastResumeTime.getTime()) / 1000
    );
    const actualRemaining = Math.max(
      0,
      session.remaining_seconds - elapsedSeconds
    );

    // ถ้าเวลาหมดแล้ว อัปเดต status
    if (actualRemaining <= 0) {
      await this.sessionModel.findByIdAndUpdate(sessionId, {
        status: SessionStatus.COMPLETED,
        remaining_seconds: 0,
      });
      return 0;
    }

    return actualRemaining;
  }

  /**
   * ดึง Session ทั้งหมด (สำหรับ Admin)
   */
  async findAll(): Promise<Session[]> {
    return this.sessionModel
      .find()
      .populate("user_id")
      .populate("device_id")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * ยกเลิก Session
   */
  async cancelSession(sessionId: string): Promise<Session> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException("Session not found");
    }

    const updatedSession = await this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        status: SessionStatus.CANCELLED,
        pause_time: new Date(),
      },
      { new: true }
    );

    if (!updatedSession) {
      throw new NotFoundException("Session not found after update");
    }

    return updatedSession;
  }

  /**
   * ดึง Move Logs ของ Session
   */
  async getMoveLogs(sessionId: string): Promise<SessionMoveLog[]> {
    return this.sessionMoveLogModel
      .find({ session_id: sessionId })
      .populate("from_device_id")
      .populate("to_device_id")
      .populate("moved_by")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
 * User เริ่ม Session ด้วยตัวเอง
 * - ถ้ามี ACTIVE อยู่แล้ว → return ตัวเดิม
 * - ใช้ session ที่ admin create ไว้แล้ว
 * - เคารพ remaining_seconds + resume_time
 */
  async startAssignedSessionsByUser(userId: string): Promise<Session[]> {
    // 🔒 กัน session ซ้ำทุกสถานะที่ยังไม่จบ
    const existing = await this.sessionModel.find({
      user_id: userId,
      status: {
        $in: [
          SessionStatus.ACTIVE,
          SessionStatus.PAUSED,
          SessionStatus.DISCONNECTED,
        ],
      },
    });

    if (existing.length > 0) {
      return existing;
    }

    const user: any = await this.userModel.findById(userId);
    if (!user || !Array.isArray(user.devices)) return [];

    const created: Session[] = [];

    const maxMove =
      this.configService.get<number>("SESSION_MAX_MOVE_COUNT") ?? 3;

    for (const d of user.devices) {
      if (d.status !== UserStatus.PENDING) continue;
      if (!d.device_id) continue;

      // 🔒 กันซ้ำระดับ device
      const deviceSession = await this.sessionModel.findOne({
        user_id: userId,
        device_id: d.device_id,
        status: { $ne: SessionStatus.COMPLETED },
      });

      if (deviceSession) continue;

      const session = await this.sessionModel.create({
        user_id: userId,
        device_id: d.device_id,
        package: "ASSIGNED_BY_ADMIN",
        total_seconds: d.total_seconds,
        remaining_seconds: d.remaining_seconds,
        status: SessionStatus.ACTIVE,
        start_time: new Date(),
        moved_count: 0,
        max_move_count: maxMove,
      });

      // update assignment
      d.status = UserStatus.INUSE;
      d.started_at = new Date();

      await this.deviceModel.findByIdAndUpdate(d.device_id, {
        status: "BUSY",
        current_user_id: userId,
      });

      created.push(await session.populate("device_id"));
    }

    await user.save();
    return created;
  }
}
