import { io, Socket } from "socket.io-client";

function getBackendUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!url) {
    throw new Error("Backend URL not configured");
  }

  return url.replace(/\/+$/, "");
}

const BACKEND_URL = getBackendUrl();

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