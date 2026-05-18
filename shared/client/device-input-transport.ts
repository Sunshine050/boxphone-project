import type { Socket } from "socket.io-client";
import type { DeviceInputPayload, DeviceInputType } from "./send-device-input";
import { sendDeviceInput } from "./send-device-input";

export type DeviceInputTarget = {
  deviceId: string;
  /** scrcpy / ADB serial — enables WebSocket fast path when set */
  deviceSerial?: string;
};

/**
 * Live stream socket reference — kept in sync by user/admin `socket-client.ts`
 * through {@link attachStreamSocketInputSync} and survives socket reconnects.
 */
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

/** Compatibility shim for older call sites. */
export function bindDeviceInputSocket(socket: Socket | null): void {
  syncDeviceInputStreamSocket(socket);
}

export function getDeviceInputSocket(): Socket | null {
  return liveStreamSocket?.connected ? liveStreamSocket : null;
}

/**
 * Send a device input event using the fastest available transport.
 *
 * - WebSocket path: emit `device_input` on the live stream socket. Resolves
 *   immediately (the gateway handles delivery and does not ack).
 * - HTTP fallback: POST `/devices/:id/input` when no socket is available.
 *
 * Critically: each call is delivered EXACTLY ONCE — never on both transports.
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

  const base = apiBaseUrl?.trim();
  if (!base) {
    if (options?.awaitResponse) {
      return Promise.reject(
        new Error("Device input unavailable: no socket and no API URL"),
      );
    }
    return;
  }
  return sendDeviceInput(base, target.deviceId, type, payload, options);
}
