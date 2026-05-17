import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://api.myrealphone.cloud";

let notificationSocket: Socket | null = null;
let streamSocket: Socket | null = null;

/**
 * Notification socket.
 * Auth: backend reads the HttpOnly access_token cookie from the socket handshake
 * (because the socket opens with withCredentials: true). A legacy `token` arg is
 * still accepted in case the cookie is unavailable (e.g. cross-origin without a
 * matching COOKIE_DOMAIN).
 */
export const getNotificationSocket = (token?: string) => {
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
    withCredentials: true,
    ...(token ? { auth: { token } } : {}),
  });

  notificationSocket.on("disconnect", () => {
    console.log("❌ Notification socket disconnected");
  });

  return notificationSocket;
};

/**
 * Stream socket — แยกจาก notification เพื่อหลีกเลี่ยง head-of-line blocking
 * ใช้สำหรับ H.264 video stream (binary heavy)
 * Auth: same cookie-based mechanism as notification socket.
 */
export const getStreamSocket = (token?: string): Socket => {
  if (streamSocket?.connected) {
    return streamSocket;
  }

  streamSocket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    forceNew: true,
    autoConnect: true,
    withCredentials: true,
    ...(token ? { auth: { token } } : {}),
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

export const closeNotificationSocket = () => {
  if (notificationSocket) {
    notificationSocket.disconnect();
    notificationSocket = null;
  }
};

/** Disconnect every persistent socket — call on logout before redirect */
export const closeAllSockets = () => {
  closeNotificationSocket();
  closeStreamSocket();
};