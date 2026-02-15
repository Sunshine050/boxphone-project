import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'notifications' })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      client.join(`user_${userId}`);
      console.log(`User connected to notification room: user_${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log('User disconnected from notification');
  }

  sendToUser(userId: string, data: any) {
    this.server.to(`user_${userId}`).emit('new_notification', data);
  }
}