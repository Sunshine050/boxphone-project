import { apiFetch } from "@/lib/api";

export const NotificationService = {
  markRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: "POST" }),

  markAll: () =>
    apiFetch(`/notifications/read-all`, { method: "POST" }),
};