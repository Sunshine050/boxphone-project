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
import * as cookie from "cookie";

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
    const token = this.extractToken(client);

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

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.trim()) return authToken.trim();

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === "string" && queryToken.trim()) return queryToken.trim();

    const authHeader = client.handshake.headers?.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const t = authHeader.slice("Bearer ".length).trim();
      if (t) return t;
    }

    const cookieHeader = client.handshake.headers?.cookie;
    if (typeof cookieHeader === "string" && cookieHeader.length > 0) {
      try {
        const parsed = cookie.parse(cookieHeader);
        if (typeof parsed.access_token === "string" && parsed.access_token.trim()) {
          return parsed.access_token.trim();
        }
      } catch {
        // ignore malformed cookie header
      }
    }

    return null;
  }

  sendToUser(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit("new_notification", payload);
  }

  /** แจ้งให้ฝั่ง user รีเฟรช session (เมื่อ admin pause/resume/cancel หรือหมดเวลา) */
  sendSessionUpdate(userId: string) {
    this.server.to(`user_${userId}`).emit("session_updated", {});
  }
}