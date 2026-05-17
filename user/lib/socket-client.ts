import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://api.myrealphone.cloud";

let notificationSocket: Socket | null = null;
let streamSocket: Socket | null = null;

/**
 * สร้าง/คืนค่า notification socket โดยส่ง JWT เข้าไปใน handshake
 * token ต้องเป็น access_token ที่ได้จาก /auth/login
 */
export const getNotificationSocket = (token: string) => {
  if (notificationSocket?.connected) {
    return notificationSocket;
  }

  notificationSocket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    forceNew: false,
    autoConnect: true,
    auth: {
      token,
    },
  });

  notificationSocket.on("disconnect", () => {
    console.log("❌ Notification socket disconnected");
  });

  return notificationSocket;
};

/**
 * Stream socket — แยกจาก notification เพื่อหลีกเลี่ยง head-of-line blocking
 * ใช้สำหรับ H.264 video stream (binary heavy)
 */
export const getStreamSocket = (token: string): Socket => {
  if (streamSocket?.connected) {
    return streamSocket;
  }

  streamSocket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    forceNew: true, // แยก connection จาก notification
    autoConnect: true,
    auth: { token },
  });

  streamSocket.on("disconnect", () => {
    console.log("❌ Stream socket disconnected");
  });

  return streamSocket;
};

export const closeStreamSocket = () => {
  if (streamSocket) {
    streamSocket.disconnect();
    streamSocket = null;
  }
};