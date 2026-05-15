import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ForbiddenException, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { DevicesService } from "../modules/devices/devices.service";
import { SessionsService } from "../modules/sessions/sessions.service";
import { DeviceStatus } from "../modules/devices/device.schema";
import { SessionStatus } from "../modules/sessions/session.schema";
import { UserRole } from "../modules/users/user.schema";
import { UsersService } from "../modules/users/users.service";

type AuthenticatedSocket = Socket & {
  data: {
    principalType?: "user" | "device";
    userId?: string;
    role?: UserRole;
    claimedDeviceId?: string;
  };
};

@WebSocketGateway({
  // CORS ของ Socket.IO ตั้งที่ ConfigurableSocketIoAdapter (main.ts) จาก CORS_ORIGINS
  // 5 MB เพียงพอสำหรับ JPEG frame ที่บีบอัดแล้วและลด DoS / memory exhaustion risk
  maxHttpBufferSize: 5e6,
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger("AppGateway");

  constructor(
    private readonly devicesService: DevicesService,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  // Map device_id -> socket_id
  private devices: Map<string, string> = new Map();

  async handleConnection(client: AuthenticatedSocket) {
    try {
      if (await this.tryAuthenticateUser(client)) {
        this.logger.log(`User socket connected: ${client.id}`);
        return;
      }
      if (this.tryAuthenticateDevice(client)) {
        this.logger.log(`Device socket connected: ${client.id}`);
        return;
      }
      throw new UnauthorizedException("Socket authentication required");
    } catch (error: any) {
      this.logger.warn(
        `Socket rejected ${client.id}: ${error?.message || "unauthorized"}`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Cleanup if it was a device
    for (const [deviceId, socketId] of this.devices.entries()) {
      if (socketId === client.id) {
        this.devices.delete(deviceId);

        // Find device first so we can preserve QUARANTINE status
        let deviceForDisconnect: any = null;
        try {
          deviceForDisconnect = await this.devicesService.findBySerialNumber(deviceId);
        } catch (_) {}

        // Keep QUARANTINE status — admin must clear it manually after wiping data
        if ((deviceForDisconnect as any)?.status !== DeviceStatus.QUARANTINE) {
          await this.devicesService.updateStatus(deviceId, DeviceStatus.OFFLINE);
        }

        // Find and pause active session for this device
        try {
          // deviceId จาก devices map คือ serial_number
          const device = deviceForDisconnect ?? await this.devicesService.findBySerialNumber(deviceId);

          if (device) {
            const session = await this.sessionsService.getActiveSessionByDevice(
              (device as any)._id.toString()
            );
            if (session && session.status === SessionStatus.ACTIVE) {
              const disconnectReason =
                this.configService.get<string>(
                  "SESSION_DEFAULT_DISCONNECT_REASON"
                );
              await this.sessionsService.pauseSession(
                (session as any)._id.toString(),
                disconnectReason
              );
              this.logger.log(
                `Session ${(session as any)._id.toString()} paused due to device disconnect`
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Error pausing session on disconnect: ${error.message}`
          );
        }

        this.server.emit("device_offline", { deviceId });
        break;
      }
    }
  }

  private extractHandshakeToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.trim()) {
      return authToken.trim();
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === "string" && queryToken.trim()) {
      return queryToken.trim();
    }

    const authHeader = client.handshake.headers?.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();
      if (token) return token;
    }

    return null;
  }

  private async tryAuthenticateUser(client: AuthenticatedSocket): Promise<boolean> {
    const token = this.extractHandshakeToken(client);
    if (!token) return false;

    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET is not configured");

    const payload = await this.jwtService.verifyAsync(token, { secret: jwtSecret });
    const userId = typeof payload?.sub === "string" ? payload.sub : null;
    if (!userId) {
      throw new UnauthorizedException("Invalid token payload");
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    client.data.principalType = "user";
    client.data.userId = (user as any)._id.toString();
    client.data.role = user.role;
    return true;
  }

  private tryAuthenticateDevice(client: AuthenticatedSocket): boolean {
    const configuredSecret =
      this.configService.get<string>("DEVICE_SOCKET_SECRET")?.trim() || "";
    if (!configuredSecret) return false;

    const authSecret = client.handshake.auth?.deviceSecret;
    const headerSecret = client.handshake.headers?.["x-device-secret"];
    const providedSecret =
      typeof authSecret === "string"
        ? authSecret
        : typeof headerSecret === "string"
          ? headerSecret
          : null;

    if (!providedSecret || providedSecret !== configuredSecret) return false;

    const claimedDeviceId = client.handshake.auth?.deviceId ?? client.handshake.query?.deviceId;
    if (typeof claimedDeviceId !== "string" || !claimedDeviceId.trim()) {
      throw new UnauthorizedException("Missing deviceId in handshake");
    }

    client.data.principalType = "device";
    client.data.claimedDeviceId = claimedDeviceId.trim();
    return true;
  }

  private async assertUserCanAccessDevice(
    client: AuthenticatedSocket,
    requestedDeviceId: string,
  ): Promise<void> {
    if (client.data.principalType !== "user" || !client.data.userId) {
      throw new ForbiddenException("Only authenticated users can control devices");
    }

    if (client.data.role === UserRole.ADMIN) return;

    const user = await this.usersService.findById(client.data.userId);
    if (!user) {
      throw new ForbiddenException("User not found");
    }

    const device = await this.devicesService.findBySerialNumber(requestedDeviceId);
    if (!device) {
      throw new ForbiddenException("Device not found");
    }

    const deviceObjectId = (device as any)._id?.toString();
    const hasAssignedDevice = Array.isArray((user as any).devices)
      && (user as any).devices.some((d: any) => String(d.device_id) === String(deviceObjectId));
    const hasLegacyDevice = String((user as any).device_id || "") === String(deviceObjectId);

    if (!hasAssignedDevice && !hasLegacyDevice) {
      throw new ForbiddenException("Device access denied");
    }
  }

  // --- Device Side Events ---

  @SubscribeMessage("device_register")
  async handleDeviceRegister(
    client: AuthenticatedSocket,
    payload: { deviceId: string; info: any }
  ) {
    if (client.data.principalType !== "device") {
      client.emit("error", { message: "Device credentials required" });
      client.disconnect(true);
      return;
    }
    if (payload.deviceId !== client.data.claimedDeviceId) {
      client.emit("error", { message: "deviceId mismatch" });
      client.disconnect(true);
      return;
    }
    const existingSocketId = this.devices.get(payload.deviceId);
    if (existingSocketId && existingSocketId !== client.id) {
      client.emit("error", { message: "device already connected" });
      client.disconnect(true);
      return;
    }

    this.logger.log(`Device Registered: ${payload.deviceId}`);
    this.devices.set(payload.deviceId, client.id);

    // Persist to DB
    await this.devicesService.register(payload.deviceId, payload.info);

    this.server.emit("device_online", { deviceId: payload.deviceId });
  }

  @SubscribeMessage("stream_data")
  handleStreamData(
    client: AuthenticatedSocket,
    payload: { deviceId: string; image: Buffer }
  ) {
    if (client.data.principalType !== "device") return;
    if (payload.deviceId !== client.data.claimedDeviceId) return;
    if (this.devices.get(payload.deviceId) !== client.id) return;

    // Forward image to the specific room (Controller Room)
    // Client controlling this device joins 'control_{deviceId}'
    this.server
      .to(`control_${payload.deviceId}`)
      .emit("screen_frame", payload.image);
  }

  // --- Web Client Side Events ---

  @SubscribeMessage("join_control")
  async handleJoinControl(client: AuthenticatedSocket, payload: { deviceId: string }) {
    try {
      await this.assertUserCanAccessDevice(client, payload.deviceId);
      client.join(`control_${payload.deviceId}`);
      this.logger.log(
        `User ${client.id} joined control room for ${payload.deviceId}`,
      );
    } catch (error: any) {
      client.emit("error", { message: error?.message || "Forbidden" });
    }
  }

  @SubscribeMessage("send_action")
  async handleSendAction(
    client: AuthenticatedSocket,
    payload: { deviceId: string; action: string; x?: number; y?: number }
  ) {
    try {
      await this.assertUserCanAccessDevice(client, payload.deviceId);
    } catch (error: any) {
      client.emit("error", { message: error?.message || "Forbidden" });
      return;
    }

    const deviceSocketId = this.devices.get(payload.deviceId);
    if (deviceSocketId) {
      this.server.to(deviceSocketId).emit("perform_action", payload);
    }
  }
}
