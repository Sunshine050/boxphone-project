import { apiFetch } from "@/lib/api";

export const SessionService = {
  async getMySession() {
    return apiFetch<any | null>("/sessions/me");
  },

  async startByUser(deviceId: string) {
    return apiFetch<any>("/sessions/start-by-user", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId }),
    });
  },

  async getRemaining(sessionId: string) {
    return apiFetch<{
      remaining_seconds: number;
      formatted?: string;
    }>(`/sessions/${sessionId}/remaining`);
  },
};
