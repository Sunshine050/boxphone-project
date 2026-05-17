import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
  Res,
  Query,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Response } from "express";
import { DevicesService } from "./devices.service";
import { Device } from "./device.schema";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../users/user.schema";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { XiaoweiWebSocketService } from "./xiaowei-websocket.service";
import { AdbScreenshotService } from "./adb-screenshot.service";
import { ScrcpyService } from "./scrcpy.service";
import { isPngImageBuffer } from "./utils/screenshot-buffer.util";
import { LogService } from "../log/log.service";

@Controller("devices")
@UseGuards(JwtAuthGuard)
export class DevicesController {
  private readonly logger = new Logger(DevicesController.name);

  constructor(
    private readonly devicesService: DevicesService,
    private readonly xiaoweiWsService: XiaoweiWebSocketService,
    private readonly adbScreenshotService: AdbScreenshotService,
    private readonly scrcpyService: ScrcpyService,
    private readonly logService: LogService,
  ) {}

  /**
   * Detect streaming capability (feature flag).
   * Frontend calls once on mount → render H264Player or ImagePoller accordingly.
   * GET /devices/streaming-mode
   */
  @Get("streaming-mode")
  @SkipThrottle()
  getStreamingMode() {
    const enabled = this.scrcpyService.isEnabled();
    return {
      mode: enabled ? "scrcpy" : "screenshot",
      codec: enabled ? "avc1.42E01E" : null,
      activeStreams: enabled ? this.scrcpyService.listActiveStreams() : [],
    };
  }

  @Get()
  async findAll(@CurrentUser() currentUser: any): Promise<Device[]> {
    if (currentUser?.role === UserRole.ADMIN) {
      return this.devicesService.findAll();
    }
    return this.devicesService.findAllForUser(currentUser?.id);
  }

  /**
   * ดึงรายการอุปกรณ์จากเสี่ยวเหว๋ยและ sync กับ database
   * GET /devices/sync-from-xiaowei
   * ⚠️ ต้องอยู่ก่อน @Get(':id') เพื่อไม่ให้ route conflict
   */
  @Get("sync-from-xiaowei")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncFromXiaowei(@CurrentUser() currentUser: any) {
    try {
      const username = currentUser?.username || "unknown";
      this.logger.log(`[SYNC] Admin ${username} syncing devices from Xiaowei`);
      return await this.devicesService.syncFromXiaowei(username);
    } catch (error: any) {
      this.logger.error(
        `[SYNC] Failed to sync devices from Xiaowei: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * ดึงหน้าจอจาก serial (ต้องอยู่ก่อน @Get(':id') เพื่อไม่ให้ "screenshot" ถูกจับเป็น :id)
   * GET /devices/screenshot?serial=xxx
   */
  @Get("screenshot")
  @SkipThrottle()
  async getScreenshotBySerial(
    @Query("serial") serial: string,
    @CurrentUser() currentUser: any,
    @Res() res: Response,
  ) {
    try {
      if (!serial) {
        return res.status(400).json({ message: "Serial number is required" });
      }
      const device = await this.devicesService.findBySerialNumber(serial);
      await this.devicesService.assertUserCanAccessDevice(currentUser, device);
      this.logger.log(`[SCREENSHOT] Request for serial: ${serial}`);
      const screenshot =
        await this.adbScreenshotService.fetchScreenshotForSerial(serial);
      const isPng = isPngImageBuffer(screenshot);
      this.logger.log(
        `[SCREENSHOT] OK for ${serial}: ${screenshot.length} bytes (${isPng ? "PNG" : "JPEG"})`,
      );
      res.setHeader("Content-Type", isPng ? "image/png" : "image/jpeg");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Content-Length", screenshot.length.toString());
      res.send(screenshot);
    } catch (error: any) {
      this.logger.error(
        `[SCREENSHOT] Failed to get screenshot for serial ${serial}: ${error.message}`,
      );
      const message =
        error.message ||
        "Failed to fetch screenshot. Check: 1) XIAOWEI_WS_URL in backend .env, 2) Xiaowei app open + API on, 3) ADB if using USB.";
      res.status(500).json({ message, error: error.message });
    }
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @CurrentUser() currentUser: any,
  ): Promise<Device> {
    const device = await this.devicesService.findOne(id);
    await this.devicesService.assertUserCanAccessDevice(currentUser, device);
    return device as Device;
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param("id") id: string,
    @Body() updateDeviceDto: any,
  ): Promise<Device> {
    return this.devicesService.update(id, updateDeviceDto);
  }

  /**
   * Mark device: แจ้งซ่อม (UNDER_REPAIR), ชำรุด (DAMAGED), รอล้างข้อมูล (QUARANTINE), พร้อมใช้งาน (AVAILABLE)
   * PATCH /devices/:id/mark-status
   */
  @Patch(":id/mark-status")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async markStatus(
    @Param("id") id: string,
    @Body()
    body: { status: "UNDER_REPAIR" | "DAMAGED" | "AVAILABLE" | "QUARANTINE" },
    @CurrentUser() currentUser: any,
  ) {
    const status = body?.status;
    if (
      !status ||
      !["UNDER_REPAIR", "DAMAGED", "AVAILABLE", "QUARANTINE"].includes(status)
    ) {
      throw new BadRequestException(
        "status must be one of: UNDER_REPAIR, DAMAGED, AVAILABLE, QUARANTINE",
      );
    }
    const existing = await this.devicesService.findOne(id);
    if (!existing) {
      throw new NotFoundException("Device not found");
    }
    const previousStatus = (existing as any).status as string;
    this.logger.log(
      `[MARK_STATUS] Admin: ${currentUser?.username || "unknown"} set device ${id} → ${status}`,
    );
    const device = await this.devicesService.update(id, { status });
    if (!device) {
      throw new NotFoundException("Device not found");
    }
    const deviceName = device.name || id;
    const serial = device.serial_number || "";
    await this.logService.createLog({
      type: "DEVICE_STATUS_CHANGED",
      level: "INFO",
      message: `เปลี่ยนสถานะเครื่อง ${deviceName}${serial ? ` (${serial})` : ""}: ${previousStatus} → ${status}`,
      target_device_id: id,
      admin_username: currentUser?.username || "admin",
      meta: { from: previousStatus, to: status },
    });
    return { message: "Device status updated", device };
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param("id") id: string) {
    await this.devicesService.remove(id);
    return { message: "Device deleted successfully" };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(
    @Body() device: any,
    @CurrentUser() currentUser: any,
  ): Promise<Device> {
    this.logger.log(
      `[CREATE_DEVICE] Admin: ${currentUser?.username || "unknown"} creating device: ${device.name || "unknown"}, Serial: ${device.serial_number || "unknown"}`,
    );
    try {
      const createdDevice = await this.devicesService.create(device);
      const deviceId = (createdDevice as any)._id.toString();
      this.logger.log(
        `[CREATE_DEVICE] ✅ Success - Device ID: ${deviceId}, Name: ${createdDevice.name}, Serial: ${createdDevice.serial_number}`,
      );
      return createdDevice;
    } catch (error) {
      this.logger.error(
        `[CREATE_DEVICE] ❌ Failed - Name: ${device.name}, Serial: ${device.serial_number}, Error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * ดึงหน้าจอเป็น JSON { image: "data:image/jpeg;base64,..." } สำหรับ <img src={image} />
   * ส่ง device.preview ไปเสี่ยวเหว๋ยแล้วรอ binary กลับมา
   * GET /devices/:id/preview
   */
  @Get(":id/preview")
  @SkipThrottle()
  async getPreview(@Param("id") id: string, @CurrentUser() currentUser: any) {
    try {
      const device = await this.devicesService.findOne(id);
      await this.devicesService.assertUserCanAccessDevice(currentUser, device);
      if (!device) {
        return { image: null, message: "Device not found" };
      }
      const serial = device.serial_number || (device as any).onlySerial;
      if (!serial) {
        return { image: null, message: "Device has no serial" };
      }
      let image: string | null = null;
      if (this.xiaoweiWsService.isConnected()) {
        try {
          const buffer = await this.xiaoweiWsService.getScreenshot(serial);
          if (buffer && buffer.length > 0) {
            const base64 = buffer.toString("base64");
            const isPng = isPngImageBuffer(buffer);
            image = `data:${isPng ? "image/png" : "image/jpeg"};base64,${base64}`;
          }
        } catch (e) {
          image = this.xiaoweiWsService.getLastPreviewBase64(serial);
        }
      }
      if (!image) {
        image = this.xiaoweiWsService.getLastPreviewBase64(serial);
      }
      return { image };
    } catch (error: any) {
      this.logger.error(`[PREVIEW] Failed for device ${id}: ${error.message}`);
      return { image: null, message: error.message };
    }
  }

  /**
   * ดึงหน้าจอจากเสี่ยวเหว๋ยตาม device ID
   * GET /devices/:id/screenshot
   */
  @Get(":id/screenshot")
  @SkipThrottle()
  async getScreenshot(
    @Param("id") id: string,
    @CurrentUser() currentUser: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.debug(`[SCREENSHOT] Request for device ID: ${id}`);

      const device = await this.devicesService.findOne(id);
      await this.devicesService.assertUserCanAccessDevice(currentUser, device);
      if (!device) {
        this.logger.warn(`[SCREENSHOT] Device not found: ${id}`);
        return res.status(404).json({ message: "Device not found" });
      }

      this.logger.debug(
        `[SCREENSHOT] Device found - Serial: ${device.serial_number}, Name: ${device.name}`,
      );

      // ใช้ serial_number หรือ onlySerial ตามเอกสารเสี่ยวเหว๋ย
      const serialToUse =
        device.serial_number ||
        (device as any).onlySerial ||
        device.serial_number;

      this.logger.debug(
        `[SCREENSHOT] Fetching screenshot for serial: ${serialToUse}`,
      );
      const screenshot =
        await this.adbScreenshotService.fetchScreenshotForSerial(serialToUse);
      const isPng = isPngImageBuffer(screenshot);
      res.setHeader("Content-Type", isPng ? "image/png" : "image/jpeg");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Content-Length", screenshot.length.toString());
      res.send(screenshot);
    } catch (error: any) {
      this.logger.error(
        `[SCREENSHOT] Failed to get screenshot for device ${id}: ${error.message}`,
      );
      this.logger.error(`[SCREENSHOT] Error stack: ${error.stack}`);
      res.status(500).json({
        message: error.message || "Failed to fetch screenshot",
        error: error.message,
      });
    }
  }

  /**
   * ส่งคำสั่งควบคุมหน้าจอ (tap/swipe/key/text) ไปยังอุปกรณ์ผ่าน ADB
   * POST /devices/:id/input
   */
  @Post(":id/input")
  @SkipThrottle()
  async sendInput(
    @Param("id") id: string,
    @Body() body: { type?: "tap" | "swipe" | "key" | "text"; payload?: any },
    @CurrentUser() currentUser: any,
  ) {
    const type = body?.type;
    const payload = body?.payload ?? {};
    if (!type || !["tap", "swipe", "key", "text"].includes(type)) {
      throw new BadRequestException(
        "type must be one of: tap, swipe, key, text",
      );
    }

    const device = await this.devicesService.findOne(id);
    await this.devicesService.assertUserCanAccessDevice(currentUser, device);
    if (!device) {
      throw new NotFoundException("Device not found");
    }

    const serialToUse =
      device.serial_number ||
      (device as any).onlySerial ||
      device.serial_number;
    if (!serialToUse) {
      throw new BadRequestException("Device serial not found");
    }

    await this.adbScreenshotService.sendInput(serialToUse, { type, payload });
    this.adbScreenshotService.clearCacheForSerial(serialToUse);

    return { ok: true };
  }
}
