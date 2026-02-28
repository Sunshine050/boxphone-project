import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
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
import { Cron, CronExpression } from "@nestjs/schedule";
import { LogService } from "../log/log.service";
import { NotificationService } from "../notification/notification.service";

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
    private readonly configService: ConfigService,

    private readonly logService: LogService,
    private readonly notificationService: NotificationService,
  ) { }

  /**
   * 🎯 ระบบตรวจสอบอัตโนมัติ (เฝ้าบ้าน)
   * จะรันทุกๆ 10 วินาที เพื่อตรวจสอบว่ามี Session ไหนเวลาหมดแล้วบ้าง
   */
  // @Cron(CronExpression.EVERY_10_SECONDS)
  // async handleAutoCleanup() {
  //   // 1. ดึงเฉพาะ Session ที่มีสถานะ ACTIVE มาตรวจสอบ
  //   const activeSessions = await this.sessionModel.find({
  //     status: SessionStatus.ACTIVE,
  //   }).exec();

  //   // 2. ส่งไปเช็คเวลาที่เหลือใน getRemainingTime
  //   // ถ้าเวลา <= 0 ฟังก์ชัน getRemainingTime เดิมที่คุณมีจะจัดการลบและคืนเครื่องให้เอง
  //   for (const session of activeSessions) {
  //     await this.getRemainingTime(session._id.toString());
  //   }
  // }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleAutoCleanup() {
    // 1. ดึงเฉพาะ Session ที่มีสถานะ ACTIVE มาตรวจสอบ
    const activeSessions = await this.sessionModel.find({
      status: SessionStatus.ACTIVE,
    }).exec();

    for (const session of activeSessions) {
      // 2. คำนวณเวลาที่เหลือจริง ณ วินาทีนี้
      const remaining = await this.getRemainingTime(session._id.toString());

      // 🎯 3. เพิ่มเงื่อนไขการแจ้งเตือน (Notification Logic)
      // เช็คว่าถ้าเหลือเวลาระหว่าง 290 - 300 วินาที (ช่วง 5 นาทีพอดี)
      if (remaining <= 300 && remaining > 290) {
        await this.notificationService.createAndSend(
          session.user_id.toString(), // ส่งหาใคร
          "เวลาของคุณใกล้หมดแล้ว!",      // หัวข้อ
          `อุปกรณ์ ${session.device_id} เหลือเวลาใช้งานไม่ถึง 5 นาที`, // ข้อความ
          "WARNING"                   // ประเภท (สีส้ม/แดงใน UI)
        );
      }
    }
  }

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

    if (session.status === SessionStatus.ACTIVE) {
      const now = new Date();
      const lastResumeTime = session.resume_time || session.start_time;

      const elapsedSeconds = Math.floor(
        (now.getTime() - lastResumeTime.getTime()) / 1000
      );

      session.remaining_seconds = Math.max(
        0,
        session.remaining_seconds - elapsedSeconds
      );

      session.status = SessionStatus.DISCONNECTED;
      session.pause_time = now;
    }

    if (
      session.status !== SessionStatus.DISCONNECTED &&
      session.status !== SessionStatus.PAUSED
    ) {
      throw new BadRequestException(
        `Cannot move session with status: ${session.status}`
      );
    }

    if (session.moved_count >= session.max_move_count) {
      throw new BadRequestException(
        `Maximum move count (${session.max_move_count}) reached`
      );
    }

    const deviceSession = await this.sessionModel.findOne({
      device_id: moveSessionDto.to_device_id,
      status: { $in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] },
    });

    if (deviceSession) {
      throw new ConflictException("Target device is already in use");
    }

    const oldDeviceId = session.device_id;
    const actualRemaining = session.remaining_seconds;

    if (oldDeviceId) {
      await this.deviceModel.findByIdAndUpdate(oldDeviceId, {
        status: DeviceStatus.AVAILABLE,
        current_user_id: null,
      });
    }

    const updatedSession = await this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        device_id: moveSessionDto.to_device_id,
        remaining_seconds: actualRemaining,
        status: SessionStatus.ACTIVE,
        resume_time: new Date(),
        moved_count: session.moved_count + 1,
        disconnect_reason: null,
      },
      { new: true }
    );

    await this.deviceModel.findByIdAndUpdate(moveSessionDto.to_device_id, {
      status: DeviceStatus.BUSY,
      current_user_id: session.user_id,
    });

    await this.sessionMoveLogModel.create({
      session_id: sessionId,
      from_device_id: oldDeviceId,
      to_device_id: moveSessionDto.to_device_id,
      remaining_seconds: actualRemaining,
      moved_by: movedByUserId,
      reason: moveSessionDto.reason || null,
    });

    await this.userModel.updateOne(
      {
        _id: session.user_id,
        "devices.device_id": oldDeviceId,
      },
      {
        $set: {
          "devices.$.device_id": moveSessionDto.to_device_id,
        },
      }
    );

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


  // async getActiveSessionsByUser(userId: string): Promise<Session[]> {
  //   const sessions = await this.sessionModel.find({
  //     user_id: userId,
  //     status: SessionStatus.ACTIVE
  //   }).exec();

  //   const now = new Date();

  //   for (const session of sessions) {
  //     const startTime = session.resume_time || session.start_time;
  //     const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

  //     // เวลาที่เหลือจริง = เวลาตั้งต้น - เวลาที่ใช้ไปแล้ว
  //     const actualRemaining = Math.max(0, session.remaining_seconds - elapsedSeconds);

  //     // อัปเดตค่านี้กลับไปใน Object ที่จะส่งออกไป (แต่อาจจะยังไม่ต้อง Save ลง DB ทันทีเพื่อลด Load)
  //     (session as any).remaining_seconds = actualRemaining;

  //     // ถ้าน้อยกว่าหรือเท่ากับ 0 ให้สั่งปิด Session ทันที
  //     if (actualRemaining <= 0) {
  //       await this.getRemainingTime(session._id.toString());
  //     }
  //   }

  //   return sessions;
  // }
  // sessions.service.ts

  async getActiveSessionsByUser(userId: string): Promise<Session[]> {
    const sessions = await this.sessionModel.find({
      user_id: userId,
      status: SessionStatus.ACTIVE
    }).exec();

    const now = new Date();

    // ใช้ map เพื่อสร้างอาเรย์ใหม่ที่มีการคำนวณเวลาแล้ว
    return sessions.map(session => {
      const sessionObj = session.toObject(); // แปลงเป็น Plain Object เพื่อแก้ไขค่าได้

      const startTime = session.resume_time || session.start_time;
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

      // 🎯 คำนวณเวลาที่เหลือจริงจาก "เวลาปัจจุบันของ Server"
      const actualRemaining = Math.max(0, session.remaining_seconds - elapsedSeconds);

      // ส่งค่าที่คำนวณแล้วกลับไปให้ Frontend
      sessionObj.remaining_seconds = actualRemaining;

      return sessionObj;
    });
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
   * คำนวณเวลาที่เหลือและล้างข้อมูลเมื่อเวลาหมด (Auto-Cleanup)
   */
  async getRemainingTime(sessionId: string): Promise<number> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) return 0;

    let actualRemaining = session.remaining_seconds;
    if (session.status === SessionStatus.ACTIVE) {
      const now = new Date();
      const lastResumeTime = session.resume_time || session.start_time;
      const elapsedSeconds = Math.floor((now.getTime() - lastResumeTime.getTime()) / 1000);
      actualRemaining = Math.max(0, session.remaining_seconds - elapsedSeconds);
    }

    if (actualRemaining <= 0) {
      const userId = session.user_id;
      const deviceId = session.device_id;
      await this.logService.createLog({
        type: 'DEVICE_DISCONNECTED',
        level: 'WARNING',
        message: `สิ้นสุดการใช้งาน: หมดเวลาการใช้งานอุปกรณ์`,
        target_user_id: session.user_id.toString(),
        target_device_id: session.device_id.toString(),
        meta: { reason: 'timeout' }
      });
      // A. คืนค่าสถานะเครื่อง
      if (deviceId) {
        await this.deviceModel.findByIdAndUpdate(deviceId, {
          status: DeviceStatus.AVAILABLE,
          current_user_id: null,
        }).exec();
      }

      // B. 🎯 อัปเดต User: ดีดเครื่องออก ($pull) และกลับสถานะเป็น PENDING
      await this.userModel.updateOne(
        { _id: userId },
        {
          $pull: { devices: { device_id: deviceId } },

          $set: {
            status: UserStatus.PENDING,
            device_id: null
          },

          $push: {
            device_history: {
              device_id: deviceId?.toString(),
              last_used_at: new Date(),
              use_count: 1
            }
          }
        }
      ).exec();

      // C. ลบ Session
      await this.sessionModel.findByIdAndDelete(sessionId).exec();
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
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.devices) return [];

    for (const d of user.devices) {
      if (d.status === 'PENDING') {
        const deviceId = d.device_id;

        const device = await this.deviceModel.findOneAndUpdate(
          { _id: deviceId, status: DeviceStatus.AVAILABLE },
          { $set: { status: DeviceStatus.BUSY, current_user_id: userId } },
          { new: true }
        );

        if (device) {
          // 1. สร้าง Session
          await this.logService.createLog({
            type: 'DEVICE_ASSIGNED',
            level: 'SUCCESS',
            message: `ผู้ใช้เริ่มเข้าใช้งานอุปกรณ์`,
            target_user_id: userId,
            target_device_id: deviceId.toString(),
          });

          await this.sessionModel.create({
            user_id: userId,
            device_id: deviceId,
            package: "ASSIGNED",
            total_seconds: d.total_seconds,
            remaining_seconds: d.remaining_seconds,
            status: SessionStatus.ACTIVE,
            start_time: new Date(),
            max_move_count: 3
          });

          // 2. 🎯 อัปเดต User: เปลี่ยนสถานะรวมเป็น INUSE และอัปเดตสถานะเครื่องใน Array
          await this.userModel.updateOne(
            { _id: userId, "devices.device_id": deviceId },
            {
              $set: {
                status: UserStatus.INUSE, // ทำให้ Admin เห็นไฟเขียว
                "devices.$.status": UserStatus.INUSE,
                "devices.$.started_at": new Date()
              }
            }
          );
        }
      }
    }
    return this.getActiveSessionsByUser(userId);
  }


  async addTimeToActiveSessions(userId: string, addSeconds: number) {
    if (!addSeconds || addSeconds <= 0) return;

    const sessions = await this.sessionModel.find({
      user_id: userId,
      status: SessionStatus.ACTIVE,
    });

    for (const s of sessions) {
      s.remaining_seconds = (s.remaining_seconds ?? 0) + addSeconds;
      await s.save();
    }
  }
}
