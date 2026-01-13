import { apiFetch } from "./api";

export const SessionsService = {
  create: (payload: any) =>
    apiFetch("/sessions", {
      method: "POST",
      body: payload,
    }),

  getAll: () => apiFetch("/sessions"),

  getById: (id: string) => apiFetch(`/sessions/${id}`),

  pause: (id: string, reason?: string) =>
    apiFetch(`/sessions/${id}/pause`, {
      method: "POST",
      body: { reason },
    }),

  resume: (id: string) =>
    apiFetch(`/sessions/${id}/resume`, {
      method: "POST",
    }),

  move: (id: string, payload: any) =>
    apiFetch(`/sessions/${id}/move`, {
      method: "POST",
      body: payload,
    }),

  cancel: (id: string) =>
    apiFetch(`/sessions/${id}/cancel`, {
      method: "POST",
    }),
};
