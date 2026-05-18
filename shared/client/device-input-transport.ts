import type { Socket } from "socket.io-client";
import type { DeviceInputPayload, DeviceInputType } from "./send-device-input";
import { sendDeviceInput } from "./send-device-input";

export type DeviceInputTarget = {
  deviceId: string;
  /** scrcpy / ADB serial — enables WebSocket path when set */
  deviceSerial?: string;
};

/** Current connected stream socket (kept in sync by socket-client on connect/disconnect). */
let liveStreamSocket: Socket | null = null;

/**
 * Update the live stream socket used for `device_input`.
 * Called from user/admin `socket-client` on connect, disconnect, and new socket creation.
 */
export function syncDeviceInputStreamSocket(socket: Socket | null): void {
  if (socket?.connected) {
    liveStreamSocket = socket;
    return;
  }
  if (!socket || liveStreamSocket === socket) {
    liveStreamSocket = null;
  }
}

/** Wire connect/disconnect handlers so touch survives stream socket reconnects. */
export function attachStreamSocketInputSync(sock: Socket): void {
  const onConnect = () => syncDeviceInputStreamSocket(sock);
  const onDisconnect = () => {
    if (liveStreamSocket === sock) {
      liveStreamSocket = null;
    }
  };
  sock.on("connect", onConnect);
  sock.on("disconnect", onDisconnect);
  if (sock.connected) {
    onConnect();
  }
}

/**
 * @deprecated Prefer `attachStreamSocketInputSync` in socket-client. Kept for compatibility.
 */
export function bindDeviceInputSocket(socket: Socket | null): void {
  syncDeviceInputStreamSocket(socket);
}

export function getDeviceInputSocket(): Socket | null {
  return liveStreamSocket?.connected ? liveStreamSocket : null;
}

/**
 * Prefer WebSocket `device_input` when stream socket is connected and serial is known.
 * Falls back to HTTP POST for screenshot mode or disconnected sockets.
 */
export function sendDeviceInputFast(
  apiBaseUrl: string,
  target: DeviceInputTarget,
  type: DeviceInputType,
  payload: DeviceInputPayload,
  options?: { awaitResponse?: boolean },
): Promise<Response> | void {
  const socket = getDeviceInputSocket();
  const useWebSocket = !!(socket && target.deviceSerial);

  if (useWebSocket) {
    socket.emit("device_input", {
      deviceId: target.deviceId,
      deviceSerial: target.deviceSerial,
      type,
      payload,
    });
    if (!options?.awaitResponse) {
      return;
    }
  }

  const base = apiBaseUrl?.trim();
  if (base) {
    return sendDeviceInput(base, target.deviceId, type, payload, options);
  }

  if (useWebSocket && options?.awaitResponse) {
    return Promise.resolve(new Response(null, { status: 200 }));
  }

  if (options?.awaitResponse) {
    return Promise.reject(
      new Error("Device input unavailable: stream socket disconnected and no API URL"),
    );
  }
}
