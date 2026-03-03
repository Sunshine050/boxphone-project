import { apiFetch } from "./api";

export const SessionsService = {
  // POST /sessions - Create session (Admin only)
  create: (payload: {
    user_id: string;
    device_id: string;
    package: string;
    total_seconds: number;
  }) =>
    apiFetch("/sessions", {
      method: "POST",
      body: payload,
    }),

  // GET /sessions - Get all sessions (Admin only)
  getAll: () => apiFetch<any[]>("/sessions"),

  // GET /sessions/:id - Get session by ID (Admin only)
  getById: (id: string) => apiFetch(`/sessions/${id}`),

  // GET /sessions/user/:userId - Get active session by user (Admin only)
  getByUser: (userId: string) => apiFetch(`/sessions/user/${userId}`),

  // GET /sessions/device/:deviceId - Get active session by device (Admin only)
  getByDevice: (deviceId: string) => apiFetch(`/sessions/device/${deviceId}`),

  // GET /sessions/:id/remaining - Get remaining time (Admin only)
  getRemainingTime: (id: string) => apiFetch(`/sessions/${id}/remaining`),

  // POST /sessions/:id/pause - Pause session (Admin only)
  pause: (id: string, reason?: string) =>
    apiFetch(`/sessions/${id}/pause`, {
      method: "POST",
      body: { reason },
    }),

  // POST /sessions/:id/resume - Resume session (Admin only)
  resume: (id: string) =>
    apiFetch(`/sessions/${id}/resume`, {
      method: "POST",
    }),

  // POST /sessions/:id/move - Move session to another device (Admin only)
  move: (id: string, payload: { to_device_id: string; reason?: string }) =>
    apiFetch(`/sessions/${id}/move`, {
      method: "POST",
      body: payload,
    }),

  // GET /sessions/:id/move-logs - Get move logs (Admin only)
  getMoveLogs: (id: string) => apiFetch(`/sessions/${id}/move-logs`),

  // POST /sessions/:id/cancel - Cancel session (Admin only)
  cancel: (id: string) =>
    apiFetch(`/sessions/${id}/cancel`, {
      method: "POST",
    }),
};
