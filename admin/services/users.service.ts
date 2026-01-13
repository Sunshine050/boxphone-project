import { apiFetch } from "./api";
import { User } from "@/types/user";

export const UsersService = {
  getAll: (): Promise<User[]> => apiFetch("/users"),

  getById: (id: string): Promise<User> => apiFetch(`/users/${id}`),

  getMe: (): Promise<User> => apiFetch("/users/me"),

  createByAdmin: (payload: {
    name: string;
    username: string;
    password: string;
  }) =>
    apiFetch("/users", {
      method: "POST",
      body: payload,
    }),

  connectDevice: (userId: string, deviceId: string) =>
    apiFetch(`/users/${userId}/connect-device`, {
      method: "POST",
      body: { device_id: deviceId },
    }),

  disconnectDevice: (userId: string) =>
    apiFetch(`/users/${userId}/disconnect-device`, {
      method: "POST",
    }),

  addTime: (
    userId: string,
    packageKey: "1h" | "1d" | "1w" | "1m" | "1y",
    startTime?: string
  ) =>
    apiFetch(`/users/${userId}/add-time`, {
      method: "POST",
      body: {
        duration: packageKey,
        ...(startTime ? { start_time: new Date(startTime).toISOString() } : {}),
      },
    }),

  delete: (id: string) =>
    apiFetch(`/users/${id}`, {
      method: "DELETE",
    }),
};
