import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "@boxphon/shared/client/api-base-url";

const BACKEND_URL = getApiBaseUrl();

let notificationSocket: Socket | null = null;

export const getNotificationSocket = (userId: string) => {
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
    query: { userId },
  });

  notificationSocket.on("disconnect", () => {
    console.log("❌ Notification socket disconnected");
  });

  return notificationSocket;
};