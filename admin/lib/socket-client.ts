import { io, type Socket } from "socket.io-client";
import {
  attachStreamSocketInputSync,
  syncDeviceInputStreamSocket,
} from "@boxphon/shared/client/device-input-transport";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3031"
).replace(/\/$/, "");

let streamSocket: Socket | null = null;

/**
 * Stream socket for admin — shared singleton, binary-heavy H.264 channel.
 * Auth: backend reads the HttpOnly access_token cookie from the handshake.
 */
export const getStreamSocket = (): Socket => {
  if (streamSocket?.connected) return streamSocket;

  streamSocket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    forceNew: true,
    autoConnect: true,
    withCredentials: true,
  });

  attachStreamSocketInputSync(streamSocket);

  streamSocket.on("disconnect", () => {
    console.warn("[AdminStream] socket disconnected");
  });

  return streamSocket;
};

export const closeStreamSocket = () => {
  if (streamSocket) {
    streamSocket.disconnect();
    streamSocket = null;
    syncDeviceInputStreamSocket(null);
  }
};
