import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const token =
      (typeof client.handshake.auth?.token === "string" && client.handshake.auth.token) ||
      (typeof client.handshake.query?.token === "string" && client.handshake.query.token) ||
      (typeof client.handshake.headers?.authorization === "string" &&
      client.handshake.headers.authorization.startsWith("Bearer ")
        ? client.handshake.headers.authorization.slice("Bearer ".length)
        : null);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const jwtSecret = this.configService.get<string>("JWT_SECRET");
      if (!jwtSecret) throw new Error("JWT_SECRET is not configured");

      const payload = await this.jwtService.verifyAsync(token, { secret: jwtSecret });
      const userId = typeof payload?.sub === "string" ? payload.sub : null;
      if (!userId) {
        throw new Error("Invalid token payload");
      }

      client.join(`user_${userId}`);
      this.logger.log(`Notification socket connected: ${client.id}`);
    } catch (error: any) {
      this.logger.warn(`Notification socket rejected ${client.id}: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Notification socket disconnected: ${client.id}`);
  }

  sendToUser(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit("new_notification", payload);
  }

  /** แจ้งให้ฝั่ง user รีเฟรช session (เมื่อ admin pause/resume/cancel หรือหมดเวลา) */
  sendSessionUpdate(userId: string) {
    this.server.to(`user_${userId}`).emit("session_updated", {});
  }
}