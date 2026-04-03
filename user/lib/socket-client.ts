import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "@boxphon/shared/client/api-base-url";

const BACKEND_URL = getApiBaseUrl();

let notificationSocket: Socket | null = null;

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