import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { exec } from "child_process";
import { promisify } from "util";
import { Device, DeviceDocument, DeviceStatus } from "./device.schema";
import { XiaoweiService } from "./xiaowei.service";
import { XiaoweiWebSocketService } from "./xiaowei-websocket.service";
import { User, UserDocument, UserRole } from "../users/user.schema";

const execAsync = promisify(exec);

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly xiaoweiService: XiaoweiService,
    private readonly xiaoweiWsService: XiaoweiWebSocketService,
  ) {}

  async findAll(): Promise<Device[]> {
    return this.deviceModel.find().sort({ last_connected_at: -1 }).exec();
  }

  async findAllForUser(userId: string): Promise<Device[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return [];

    const assignedIds = (
      Array.isArray((user as any).devices) ? (user as any).devices : []
    )
      .map((d: any) => String(d.device_id))
      .filter(Boolean);
    const legacyDeviceId = String((user as any).device_id || "");
    if (legacyDeviceId) {
      assignedIds.push(legacyDeviceId);
    }

    if (assignedIds.length === 0) return [];
    return this.deviceModel
      .find({ _id: { $in: assignedIds } })
      .sort({ last_connected_at: -1 })
      .exec();
  }

  async register(deviceId: string, info: any): Promise<Device> {
    return this.deviceModel
      .findOneAndUpdate(
        { serial_number: deviceId },
        {
          serial_number: deviceId,
          name: info.model || deviceId,
          model: info.model,
          sdk_version: info.sdk,
          status: DeviceStatus.AVAILABLE,
          last_connected_at: new Date(),
          metadata: info,
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async updateStatus(deviceId: string, status: DeviceStatus): Promise<void> {
    await this.deviceModel
      .updateOne({ serial_number: deviceId }, { status })
      .exec();
  }

  async findOne(id: string): Promise<Device | null> {
    return this.deviceModel.findById(id).exec();
  }

  async findBySerialNumber(serialNumber: string): Promise<Device | null> {
    return this.deviceModel.findOne({ serial_number: serialNumber }).exec();
  }

  async assertUserCanAccessDevice(
    requester: { id?: string; role?: UserRole },
    device: Device | null,
  ): Promise<void> {
    if (!requester?.id) {
      throw new ForbiddenException("User not authenticated");
    }
    if (requester.role === UserRole.ADMIN) return;
    if (!device) {
      throw new ForbiddenException("Device not found");
    }

    const user = await this.userModel.findById(requester.id).exec();
    if (!user) {
      throw new ForbiddenException("User not found");
    }

    const deviceId = (device as any)._id?.toString();
    const hasAssignedDevice =
      Array.isArray((user as any).devices) &&
      (user as any).devices.some(
        (d: any) => String(d.device_id) === String(deviceId),
      );
    const hasLegacyDevice =
      String((user as any).device_id || "") === String(deviceId);
    const isCurrentUser =
      String((device as any).current_user_id || "") === String(requester.id);

    if (!hasAssignedDevice && !hasLegacyDevice && !isCurrentUser) {
      throw new ForbiddenException("Device access denied");
    }
  }

  async update(id: string, updateDeviceDto: any): Promise<Device | null> {
    return this.deviceModel
      .findByIdAndUpdate(id, updateDeviceDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<void> {
    await this.deviceModel.findByIdAndDelete(id).exec();
  }

  async create(createDeviceDto: any): Promise<Device> {
    const createdDevice = new this.deviceModel({
      ...createDeviceDto,
      status: DeviceStatus.AVAILABLE,
      last_connected_at: new Date(),
    });

    return createdDevice.save();
  }

  async syncFromXiaowei(adminUsername: string): Promise<any> {
    this.logger.log(
      `[SYNC] Admin ${adminUsername} syncing devices from Xiaowei`,
    );

    let xiaoweiDevices: any[] = [];
    try {
      if (this.xiaoweiWsService.isConnected()) {
        xiaoweiDevices = await this.xiaoweiWsService.getDeviceList();
        this.logger.log(
          `[SYNC] Fetched ${xiaoweiDevices.length} devices via WebSocket`,
        );
      } else {
        throw new Error("WebSocket not connected");
      }
    } catch (wsError: any) {
      this.logger.warn(
        `[SYNC] WebSocket failed, trying HTTP: ${wsError.message}`,
      );
      try {
        xiaoweiDevices = await this.xiaoweiService.getDeviceList();
        this.logger.log(
          `[SYNC] Fetched ${xiaoweiDevices.length} devices via HTTP`,
        );
      } catch (httpError: any) {
        throw new Error(`Both WebSocket and HTTP failed: ${httpError.message}`);
      }
    }
    this.logger.log(
      `[SYNC] Found ${xiaoweiDevices.length} devices from Xiaowei`,
    );

    if (xiaoweiDevices.length === 0) {
      try {
        const adbPath = this.configService.get<string>("ADB_PATH") || "adb";
        const adbCmd = adbPath.includes(" ") ? `"${adbPath}"` : adbPath;
        const { stdout: adbOut } = await execAsync(`${adbCmd} devices`, {
          encoding: "utf8",
          timeout: 5000,
        });
        const lines = adbOut.split(/\r?\n/).filter((l) => l.trim());
        const adbList: { serial: string; status: string }[] = [];
        for (const line of lines) {
          if (line.startsWith("List of devices")) continue;
          const parts = line.split(/\s+/).filter(Boolean);
          if (parts.length >= 2 && parts[1] === "device") {
            adbList.push({ serial: parts[0], status: "online" });
          }
        }
        if (adbList.length > 0) {
          xiaoweiDevices = adbList.map((d) => ({
            serial: d.serial,
            onlySerial: d.serial,
            status: d.status,
            name: `Device ${d.serial}`,
            model: "ADB",
          }));
          this.logger.log(
            `[SYNC] Fallback: got ${xiaoweiDevices.length} devices from ADB`,
          );
        }
      } catch (adbErr: any) {
        this.logger.warn(`[SYNC] ADB fallback failed: ${adbErr.message}`);
      }
    }

    const syncedDevices = [];
    const rawStatusCount: Record<string, number> = {};
    for (const xiaoweiDevice of xiaoweiDevices) {
      try {
        const serial = xiaoweiDevice.serial || xiaoweiDevice.onlySerial;
        const name =
          xiaoweiDevice.name || xiaoweiDevice.model || `Device ${serial}`;
        const model = xiaoweiDevice.model || "Unknown";
        const rawStatus = String(
          xiaoweiDevice.status ??
            xiaoweiDevice.state ??
            xiaoweiDevice.deviceStatus ??
            "",
        )
          .trim()
          .toLowerCase();
        rawStatusCount[rawStatus || "(empty)"] =
          (rawStatusCount[rawStatus || "(empty)"] ?? 0) + 1;
        const isOnline =
          xiaoweiDevice.online === true ||
          [
            "online",
            "device",
            "ready",
            "connected",
            "active",
            "alive",
            "ok",
          ].includes(rawStatus);
        const status = isOnline ? DeviceStatus.AVAILABLE : DeviceStatus.OFFLINE;

        let device = await this.findBySerialNumber(serial);

        if (!device) {
          device = await this.create({
            name,
            serial_number: serial,
            model,
            status,
            metadata: xiaoweiDevice,
          });
          this.logger.log(`[SYNC] Created new device: ${name} (${serial})`);
        } else {
          const deviceId =
            (device as any)._id?.toString() || (device as any).id?.toString();
          const currentStatus = (device as any).status;
          const keepManualStatus =
            currentStatus === DeviceStatus.UNDER_REPAIR ||
            currentStatus === DeviceStatus.DAMAGED ||
            currentStatus === DeviceStatus.QUARANTINE;
          if (deviceId) {
            const updatePayload: Record<string, unknown> = {
              name,
              model,
              metadata: xiaoweiDevice,
              last_connected_at: new Date(),
            };
            if (!keepManualStatus) {
              updatePayload.status = status;
            }
            await this.update(deviceId, updatePayload);
            this.logger.log(
              `[SYNC] Updated device: ${name} (${serial})${keepManualStatus ? " [status kept]" : ""}`,
            );
          }
        }

        const deviceId =
          (device as any)._id?.toString() || (device as any).id?.toString();
        syncedDevices.push({
          id: deviceId,
          name: device.name,
          serial_number: device.serial_number,
          status: device.status,
        });
      } catch (error: any) {
        this.logger.error(
          `[SYNC] Failed to sync device ${xiaoweiDevice.serial || xiaoweiDevice.onlySerial}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `[SYNC] Raw status summary from Xiaowei: ${
        Object.entries(rawStatusCount)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ") || "none"
      }`,
    );

    return {
      message: `Synced ${syncedDevices.length} devices from Xiaowei`,
      total: xiaoweiDevices.length,
      synced: syncedDevices.length,
      devices: syncedDevices,
    };
  }
}
