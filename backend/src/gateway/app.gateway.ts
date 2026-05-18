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
import * as cookie from "cookie";

import { DevicesService } from "../modules/devices/devices.service";
import { SessionsService } from "../modules/sessions/sessions.service";
import { DeviceStatus } from "../modules/devices/device.schema";
import { SessionStatus } from "../modules/sessions/session.schema";
import { UserRole } from "../modules/users/user.schema";
import { UsersService } from "../modules/users/users.service";
import {
  ScrcpyService,
  FrameMeta,
} from "../modules/devices/scrcpy.service";
import { AdbScreenshotService } from "../modules/devices/adb-screenshot.service";

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
    private readonly scrcpyService: ScrcpyService,
    private readonly adbScreenshotService: AdbScreenshotService,
  ) {}

  // Map device_id -> socket_id
  private devices: Map<string, string> = new Map();

  // socket.id -> serial -> unsubscribe fn (scrcpy stream subscriptions per socket)
  private streamSubscriptions: Map<string, Map<string, () => void>> = new Map();

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

    // Cleanup scrcpy stream subscriptions for this socket (if user)
    const subs = this.streamSubscriptions.get(client.id);
    if (subs) {
      subs.forEach((unsub) => {
        try {
          unsub();
        } catch (e: any) {
          this.logger.warn(
            `scrcpy unsubscribe on disconnect failed: ${e.message}`,
          );
        }
      });
      this.streamSubscriptions.delete(client.id);
    }

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

    // HttpOnly access_token cookie — sent automatically when client uses
    // withCredentials: true on socket.io connection. Allows browser sockets to
    // authenticate without exposing the JWT to JavaScript.
    const cookieHeader = client.handshake.headers?.cookie;
    if (typeof cookieHeader === "string" && cookieHeader.length > 0) {
      try {
        const parsed = cookie.parse(cookieHeader);
        const fromCookie = parsed.access_token;
        if (typeof fromCookie === "string" && fromCookie.trim()) {
          return fromCookie.trim();
        }
      } catch {
        // malformed cookie header — fall through
      }
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

  /* ════════════════ scrcpy H.264 streaming ════════════════ */

  /**
   * Subscribe to a device's H.264 stream.
   * Server starts scrcpy if not already running. Frames are pushed back as
   * `stream_frame` (binary Buffer + meta). Initial config (SPS/PPS) replays
   * immediately so the client's WebCodecs decoder can initialize.
   */
  @SubscribeMessage("stream_subscribe")
  async handleStreamSubscribe(
    client: AuthenticatedSocket,
    payload: { deviceSerial: string },
  ) {
    const serial = payload?.deviceSerial?.trim();
    if (!serial) {
      client.emit("stream_error", { message: "deviceSerial required" });
      return;
    }

    try {
      await this.assertUserCanAccessDevice(client, serial);
    } catch (error: any) {
      client.emit("stream_error", {
        deviceSerial: serial,
        message: error?.message || "Forbidden",
      });
      return;
    }

    if (!this.scrcpyService.isEnabled()) {
      client.emit("stream_error", {
        deviceSerial: serial,
        message: "scrcpy streaming is disabled (STREAMING_MODE!=scrcpy)",
      });
      return;
    }

    // Don't double-subscribe the same socket to the same device
    const existing = this.streamSubscriptions.get(client.id);
    if (existing?.has(serial)) {
      this.logger.debug(
        `${client.id} already subscribed to ${serial}, ignoring`,
      );
      return;
    }

    try {
      const { metadata, unsubscribe } = await this.scrcpyService.subscribe(
        serial,
        client.id,
        (nalUnit: Buffer, meta: FrameMeta) => {
          // socket.io passes Buffer as binary frame automatically
          client.emit("stream_frame", {
            deviceSerial: serial,
            data: nalUnit,
            isConfig: meta.isConfig,
            isKeyFrame: meta.isKeyFrame,
            pts: meta.pts.toString(),
          });
        },
      );

      let subs = this.streamSubscriptions.get(client.id);
      if (!subs) {
        subs = new Map();
        this.streamSubscriptions.set(client.id, subs);
      }
      subs.set(serial, unsubscribe);

      client.emit("stream_metadata", {
        deviceSerial: serial,
        ...metadata,
      });
      this.logger.log(`stream_subscribe ${client.id} → ${serial}`);
    } catch (error: any) {
      this.logger.warn(
        `stream_subscribe failed for ${serial}: ${error.message}`,
      );
      client.emit("stream_error", {
        deviceSerial: serial,
        message: error.message || "Failed to subscribe",
      });
    }
  }

  /**
   * Low-latency device input over the stream WebSocket (preferred over HTTP POST).
   * Supports multi-pointer touch when scrcpy control channel is active.
   */
  @SubscribeMessage("device_input")
  async handleDeviceInput(
    client: AuthenticatedSocket,
    payload: {
      deviceId?: string;
      deviceSerial?: string;
      type?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const type = payload?.type;
    const body = payload?.payload ?? {};
    if (
      !type ||
      !["tap", "swipe", "touch", "key", "text"].includes(type)
    ) {
      return;
    }

    let serial = payload?.deviceSerial?.trim() || "";
    if (!serial && payload?.deviceId) {
      try {
        const device = await this.devicesService.findOne(payload.deviceId);
        serial =
          device?.serial_number || (device as any)?.onlySerial || "";
      } catch {
        return;
      }
    }
    if (!serial) return;

    try {
      await this.assertUserCanAccessDevice(client, serial);
    } catch {
      return;
    }

    this.logger.debug(
      `device_input ${client.id} ${serial} type=${type}`,
    );

    if (type === "text") {
      try {
        await this.adbScreenshotService.sendInput(serial, {
          type: "text",
          payload: body,
        });
      } catch {
        /* ignore */
      }
      return;
    }

    if (
      this.scrcpyService.isEnabled() &&
      this.scrcpyService.hasActiveStream(serial)
    ) {
      const multi = body.multi as
        | { action: string; pointerId: number; x: number; y: number }[]
        | undefined;
      if (Array.isArray(multi) && multi.length > 0) {
        const activeCount = Number(body.activePointerCount ?? multi.length);
        for (const ev of multi) {
          const pid = Math.round(Number(ev.pointerId));
          const x = Math.round(Number(ev.x));
          const y = Math.round(Number(ev.y));
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          if (ev.action === "down") {
            this.scrcpyService.sendPointerDown(
              serial,
              pid,
              x,
              y,
              activeCount <= 1,
            );
          } else if (ev.action === "up") {
            this.scrcpyService.sendPointerUp(
              serial,
              pid,
              x,
              y,
              activeCount <= 1,
            );
          } else if (ev.action === "move") {
            this.scrcpyService.sendPointerMove(serial, pid, x, y);
          }
        }
        return;
      }

      if (
        this.scrcpyService.sendInput(serial, {
          type: type as "tap" | "swipe" | "touch" | "key",
          payload: body,
        })
      ) {
        return;
      }
    }

    try {
      if (type === "touch" && body.action === "move") {
        void this.adbScreenshotService
          .sendInput(serial, { type: "touch", payload: body })
          .catch(() => {});
        return;
      }
      await this.adbScreenshotService.sendInput(serial, {
        type: type as "tap" | "swipe" | "touch" | "key",
        payload: body,
      });
    } catch {
      /* best-effort */
    }
  }

  @SubscribeMessage("stream_unsubscribe")
  async handleStreamUnsubscribe(
    client: AuthenticatedSocket,
    payload: { deviceSerial: string },
  ) {
    const serial = payload?.deviceSerial?.trim();
    if (!serial) return;
    const subs = this.streamSubscriptions.get(client.id);
    const unsub = subs?.get(serial);
    if (unsub) {
      try {
        unsub();
      } catch (e: any) {
        this.logger.warn(`stream_unsubscribe failed: ${e.message}`);
      }
      subs!.delete(serial);
      if (subs!.size === 0) this.streamSubscriptions.delete(client.id);
      this.logger.log(`stream_unsubscribe ${client.id} ← ${serial}`);
    }
  }
}
