import { apiFetch } from "./api";

export const SessionsService = {
  // GET /sessions/user/:userId - Get active session by user
  getByUser: (userId: string) => apiFetch(`/sessions/user/${userId}`),

  // GET /sessions/:id - Get session by ID
  getById: (id: string) => apiFetch(`/sessions/${id}`),

  // GET /sessions/:id/remaining - Get remaining time
  getRemainingTime: (id: string) => apiFetch(`/sessions/${id}/remaining`),
};
