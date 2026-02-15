

import { io, Socket } from "socket.io-client";

// lib/socket-client.ts

function getBackendUrl(): string {
  if (typeof window !== "undefined") {
    const env = (window as any).__NEXT_DATA__?.env;

    if (env?.NEXT_PUBLIC_API_URL) {
      return env.NEXT_PUBLIC_API_URL;
    }
  }

  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  throw new Error("NEXT_PUBLIC_API_URL is not configured");
}

const BACKEND_URL = getBackendUrl();

export class SocketClient {
  private socket: Socket | null = null;
  private deviceId: string | null = null;
  private onScreenFrameCallback: ((imageData: string) => void) | null = null;
  private demoMode: boolean = false;

  connect(deviceId: string) {
    if (this.socket?.connected && this.deviceId === deviceId) {
      return; 
    }

    this.disconnect();
    this.deviceId = deviceId;

    
    if (typeof window === "undefined") {
      console.log("🔶 Demo Mode: Not in browser, using mock connection");
      this.demoMode = true;
      this.simulateDemoConnection();
      return;
    }

    try {
      this.socket = io(BACKEND_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on("connect", () => {
        console.log("✅ Connected to server");
        this.joinControl(deviceId);
      });

      this.socket.on("disconnect", () => {
        console.log("❌ Disconnected from server");
      });

      this.socket.on(
        "screen_frame",
        (imageData: string | ArrayBuffer | Uint8Array) => {
          if (this.onScreenFrameCallback) {
            let base64: string;
            if (typeof imageData === "string") {
              base64 = imageData;
            } else if (imageData instanceof ArrayBuffer) {
              // Convert ArrayBuffer to base64
              const bytes = new Uint8Array(imageData);
              const binary = Array.from(bytes, (byte) =>
                String.fromCharCode(byte)
              ).join("");
              base64 = `data:image/jpeg;base64,${btoa(binary)}`;
            } else if (imageData instanceof Uint8Array) {
              const binary = Array.from(imageData, (byte) =>
                String.fromCharCode(byte)
              ).join("");
              base64 = `data:image/jpeg;base64,${btoa(binary)}`;
            } else {
              
              const bytes = new Uint8Array(imageData as any);
              const binary = Array.from(bytes, (byte) =>
                String.fromCharCode(byte)
              ).join("");
              base64 = `data:image/jpeg;base64,${btoa(binary)}`;
            }
            this.onScreenFrameCallback(base64);
          }
        }
      );

      this.socket.on("connect_error", (error: any) => {
        console.error("Connection error:", error);
        this.demoMode = true;
        this.simulateDemoConnection();
      });
    } catch (error) {
      console.warn("Failed to connect, using demo mode:", error);
      this.demoMode = true;
      this.simulateDemoConnection();
    }
  }

  private simulateDemoConnection() {
    setTimeout(() => {
      if (this.onScreenFrameCallback) {
        console.log("🔶 Demo Mode: Simulated connection");
      }
    }, 1000);
  }

  joinControl(deviceId: string) {
    if (this.socket?.connected) {
      this.socket.emit("join_control", { deviceId });
      console.log(`Joined control room for device: ${deviceId}`);
    }
  }

  sendAction(
    action: "click" | "swipe" | "type",
    data: { x?: number; y?: number; text?: string }
  ) {
    if (this.demoMode) {
      console.log(`🔶 Demo Mode: Action ${action}`, data);
      return;
    }

    if (this.socket?.connected && this.deviceId) {
      this.socket.emit("send_action", {
        deviceId: this.deviceId,
        action,
        ...data,
      });
      console.log(`Sent action: ${action}`, data);
    }
  }

  onScreenFrame(callback: (imageData: string) => void) {
    this.onScreenFrameCallback = callback;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.deviceId = null;
    this.demoMode = false;
  }

  isConnected(): boolean {
    if (this.demoMode) return true; 
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const socketClient = new SocketClient();

export const getNotificationSocket = (userId: string) => {
  return io(`${BACKEND_URL}/notifications`, {
    query: { userId },
    transports: ["websocket"],
    reconnection: true,
  });
};