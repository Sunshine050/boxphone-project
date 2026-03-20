import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (!userId) {
      client.disconnect();
      return;
    }

    client.join(`user_${userId}`);
    console.log(`🔔 CONNECT user_${userId} (${client.id})`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ DISCONNECT ${client.id}`);
  }

  sendToUser(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit("new_notification", payload);
  }

  /** แจ้งให้ฝั่ง user รีเฟรช session (เมื่อ admin pause/resume/cancel หรือหมดเวลา) */
  sendSessionUpdate(userId: string) {
    this.server.to(`user_${userId}`).emit("session_updated", {});
  }
}