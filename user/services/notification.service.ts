import { apiFetch } from "@/lib/api";

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "DANGER";
  is_read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalUnread?: number;
}

export const NotificationService = {
  getPage: (page: number = 1, limit: number = 10) =>
    apiFetch<NotificationsResponse>(`/notifications/me?page=${page}&limit=${limit}`),

  markRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: "POST" }),

  markAll: () =>
    apiFetch(`/notifications/read-all`, { method: "POST" }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/notifications/${id}`, { method: "DELETE" }),

  clearAll: () =>
    apiFetch<{ deleted: number }>(`/notifications/me/clear`, { method: "DELETE" }),
};