import { io, Socket } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const socket: Socket = io(URL, {
    autoConnect: false,
    transports: ['websocket'], // Force WebSocket for better performance
});
