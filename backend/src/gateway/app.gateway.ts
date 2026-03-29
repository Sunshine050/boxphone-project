import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DevicesService } from "../modules/devices/devices.service";
import { SessionsService } from "../modules/sessions/sessions.service";
import { DeviceStatus } from "../modules/devices/device.schema";
import { SessionStatus } from "../modules/sessions/session.schema";

@WebSocketGateway({
  // CORS ของ Socket.IO ตั้งที่ ConfigurableSocketIoAdapter (main.ts) จาก CORS_ORIGINS
  maxHttpBufferSize: 1e8, // 100 MB for image streams just in case
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger("AppGateway");

  constructor(
    private readonly devicesService: DevicesService,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService
  ) {}

  // Map device_id -> socket_id
  private devices: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Auth logic could go here (check handshake query token)
  }

  async handleDisconnect(client: Socket) {
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

  // --- Device Side Events ---

  @SubscribeMessage("device_register")
  async handleDeviceRegister(
    client: Socket,
    payload: { deviceId: string; info: any }
  ) {
    this.logger.log(`Device Registered: ${payload.deviceId}`);
    this.devices.set(payload.deviceId, client.id);

    // Persist to DB
    await this.devicesService.register(payload.deviceId, payload.info);

    this.server.emit("device_online", { deviceId: payload.deviceId });
  }

  @SubscribeMessage("stream_data")
  handleStreamData(
    client: Socket,
    payload: { deviceId: string; image: Buffer }
  ) {
    // Forward image to the specific room (Controller Room)
    // Client controlling this device joins 'control_{deviceId}'
    this.server
      .to(`control_${payload.deviceId}`)
      .emit("screen_frame", payload.image);
  }

  // --- Web Client Side Events ---

  @SubscribeMessage("join_control")
  handleJoinControl(client: Socket, payload: { deviceId: string }) {
    client.join(`control_${payload.deviceId}`);
    this.logger.log(
      `User ${client.id} joined control room for ${payload.deviceId}`
    );
  }

  @SubscribeMessage("send_action")
  handleSendAction(
    client: Socket,
    payload: { deviceId: string; action: string; x?: number; y?: number }
  ) {
    const deviceSocketId = this.devices.get(payload.deviceId);
    if (deviceSocketId) {
      this.server.to(deviceSocketId).emit("perform_action", payload);
    }
  }
}
