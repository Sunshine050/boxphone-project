import type { Socket } from "socket.io-client";
import type { DeviceInputPayload, DeviceInputType } from "./send-device-input";
import { sendDeviceInput } from "./send-device-input";

export type DeviceInputTarget = {
  deviceId: string;
  /** scrcpy / ADB serial — enables WebSocket fast path when set */
  deviceSerial?: string;
};

let liveStreamSocket: Socket | null = null;

export function syncDeviceInputStreamSocket(socket: Socket | null): void {
  if (socket?.connected) {
    liveStreamSocket = socket;
    return;
  }
  if (!socket || liveStreamSocket === socket) {
    liveStreamSocket = null;
  }
}

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

export function bindDeviceInputSocket(socket: Socket | null): void {
  syncDeviceInputStreamSocket(socket);
}

export function getDeviceInputSocket(): Socket | null {
  return liveStreamSocket?.connected ? liveStreamSocket : null;
}

/**
 * Send device input.
 * - `tap` / `swipe` / `key` → HTTP (ADB, reliable).
 * - `touch` → WebSocket when available (video-space coords for scrcpy).
 */
export function sendDeviceInputFast(
  apiBaseUrl: string,
  target: DeviceInputTarget,
  type: DeviceInputType,
  payload: DeviceInputPayload,
  options?: { awaitResponse?: boolean; forceHttp?: boolean },
): Promise<Response> | void {
  let base = apiBaseUrl?.trim();
  if (!base && typeof window !== "undefined") {
    base = `${window.location.origin}/api/proxy`;
  }
  const mustUseHttp =
    options?.forceHttp ||
    type === "tap" ||
    type === "swipe" ||
    type === "key";

  if (!mustUseHttp) {
    const socket = getDeviceInputSocket();
    if (socket && target.deviceSerial) {
      socket.emit("device_input", {
        deviceId: target.deviceId,
        deviceSerial: target.deviceSerial,
        type,
        payload,
      });
      return;
    }
  }

  if (!base) {
    if (options?.awaitResponse) {
      return Promise.reject(
        new Error("Device input unavailable: no API URL configured"),
      );
    }
    return;
  }
  return sendDeviceInput(base, target.deviceId, type, payload, options);
}
