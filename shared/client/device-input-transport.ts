import type { Socket } from "socket.io-client";
import type { DeviceInputPayload, DeviceInputType } from "./send-device-input";
import { sendDeviceInput } from "./send-device-input";

export type DeviceInputTarget = {
  deviceId: string;
  /** scrcpy / ADB serial — enables WebSocket path when set */
  deviceSerial?: string;
};

let streamSocketRef: Socket | null = null;

/** Bind the stream socket used for H.264 (same connection for low-latency input). */
export function bindDeviceInputSocket(socket: Socket | null): void {
  streamSocketRef = socket;
}

export function getDeviceInputSocket(): Socket | null {
  return streamSocketRef?.connected ? streamSocketRef : null;
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
  if (socket && target.deviceSerial) {
    socket.emit("device_input", {
      deviceId: target.deviceId,
      deviceSerial: target.deviceSerial,
      type,
      payload,
    });
    if (options?.awaitResponse) {
      return Promise.resolve(new Response(null, { status: 200 }));
    }
    return;
  }

  return sendDeviceInput(
    apiBaseUrl,
    target.deviceId,
    type,
    payload,
    options,
  );
}
