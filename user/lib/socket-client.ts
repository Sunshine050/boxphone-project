import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export class SocketClient {
  private socket: Socket | null = null;
  private deviceId: string | null = null;
  private onScreenFrameCallback: ((imageData: string) => void) | null = null;

  connect(deviceId: string) {
    if (this.socket?.connected && this.deviceId === deviceId) {
      return; // Already connected to this device
    }

    this.disconnect();

    this.deviceId = deviceId;
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

    this.socket.on("screen_frame", (imageData: Buffer | string) => {
      // Convert buffer to base64 or use directly
      if (this.onScreenFrameCallback) {
        const base64 = typeof imageData === "string" 
          ? imageData 
          : `data:image/jpeg;base64,${imageData.toString("base64")}`;
        this.onScreenFrameCallback(base64);
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  }

  joinControl(deviceId: string) {
    if (this.socket?.connected) {
      this.socket.emit("join_control", { deviceId });
      console.log(`Joined control room for device: ${deviceId}`);
    }
  }

  sendAction(action: "click" | "swipe" | "type", data: { x?: number; y?: number; text?: string }) {
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
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const socketClient = new SocketClient();

