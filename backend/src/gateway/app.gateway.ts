import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*', // Allow all for dev
    },
    maxHttpBufferSize: 1e8 // 100 MB for image streams just in case
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('AppGateway');

    // Map device_id -> socket_id (Phase 2)
    private devices: Map<string, string> = new Map();

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);

        // Auth logic could go here (check handshake query token)
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        // Cleanup if it was a device
        for (const [deviceId, socketId] of this.devices.entries()) {
            if (socketId === client.id) {
                this.devices.delete(deviceId);
                this.server.emit('device_offline', { deviceId });
                break;
            }
        }
    }

    // --- Device Side Events ---

    @SubscribeMessage('device_register')
    handleDeviceRegister(client: Socket, payload: { deviceId: string; info: any }) {
        this.logger.log(`Device Registered: ${payload.deviceId}`);
        this.devices.set(payload.deviceId, client.id);
        // Persist status to DB (DevicesService) here normally
        this.server.emit('device_online', { deviceId: payload.deviceId });
    }

    @SubscribeMessage('stream_data')
    handleStreamData(client: Socket, payload: { deviceId: string; image: Buffer }) {
        // Forward image to the specific room (Controller Room)
        // Client controlling this device joins 'control_{deviceId}'
        this.server.to(`control_${payload.deviceId}`).emit('screen_frame', payload.image);
    }

    // --- Web Client Side Events ---

    @SubscribeMessage('join_control')
    handleJoinControl(client: Socket, payload: { deviceId: string }) {
        client.join(`control_${payload.deviceId}`);
        this.logger.log(`User ${client.id} joined control room for ${payload.deviceId}`);
    }

    @SubscribeMessage('send_action')
    handleSendAction(client: Socket, payload: { deviceId: string; action: string; x?: number; y?: number }) {
        const deviceSocketId = this.devices.get(payload.deviceId);
        if (deviceSocketId) {
            this.server.to(deviceSocketId).emit('perform_action', payload);
        }
    }
}
