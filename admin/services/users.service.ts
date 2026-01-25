import { apiFetch } from "./api";
import { User } from "@/types/user";

export const UsersService = {
  getAll: (): Promise<User[]> => apiFetch<User[]>("/users"),

  getById: (id: string): Promise<User> => apiFetch<User>(`/users/${id}`),

  getMe: (): Promise<User> => apiFetch<User>("/users/me"),

  createByAdmin: (payload: {
    name: string;
    username: string;
    password: string;
  }) =>
    apiFetch("/users", {
      method: "POST",
      body: payload,
    }),

  assignDevices: (
    userId: string,
    items: { device_id: string; assign_seconds?: number }[]
  ) =>
    apiFetch(`/users/${userId}/assign-devices`, {
      method: "POST",
      body: { items },
    }),

  bulkAddTimeToInuse: (addSeconds: number) =>
    apiFetch(`/users/bulk-add-time`, {
      method: "POST",
      body: { add_seconds: addSeconds },
    }),

  disconnectDevice: (userId: string) =>
    apiFetch(`/users/${userId}/disconnect-device`, {
      method: "POST",
    }),

  delete: (id: string) =>
    apiFetch(`/users/${id}`, {
      method: "DELETE",
    }),
};
