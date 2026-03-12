import { apiFetch } from "./api";
import { User } from "@/types/user";

export const UsersService = {
  // GET /users - Get all users (Admin only)
  getAll: (): Promise<User[]> => apiFetch<User[]>("/users"),

  // GET /users/:id - Get user by ID (Admin only)
  getById: (id: string): Promise<User> => apiFetch<User>(`/users/${id}`),

  // GET /users/me - Get current user profile
  getMe: (): Promise<User> => apiFetch<User>("/users/me"),

  // POST /users - Create user (Admin only)
  createByAdmin: (payload: {
    name: string;
    username: string;
    password: string;
  }) =>
    apiFetch("/users", {
      method: "POST",
      body: payload,
    }),

  // PATCH /users/:id - Update user (Admin only)
  update: (id: string, payload: any) =>
    apiFetch(`/users/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  // DELETE /users/:id - Delete user (Admin only)
  delete: (id: string) =>
    apiFetch(`/users/${id}`, {
      method: "DELETE",
    }),

  // POST /users/:id/add-time - Add time to user (Admin only)
  addTime: (id: string, payload: { duration: string; start_time?: string }) =>
    apiFetch(`/users/${id}/add-time`, {
      method: "POST",
      body: payload,
    }),

  // POST /users/:id/assign-devices - Assign devices to user (Admin only)
  assignDevices: (
    userId: string,
    items: { device_id: string; assign_seconds?: number }[]
  ) =>
    apiFetch(`/users/${userId}/assign-devices`, {
      method: "POST",
      body: { items },
    }),

  // POST /users/bulk-add-time - Add time to all INUSE users (Admin only)
  bulkAddTimeToInuse: (addSeconds: number, note?: string) =>
    apiFetch(`/users/bulk-add-time`, {
      method: "POST",
      body: { add_seconds: addSeconds, ...(note && note.trim() ? { note: note.trim() } : {}) },
    }),

  // POST /users/:id/connect-device - Connect user to device (Admin only)
  connectDevice: (userId: string, deviceId: string) =>
    apiFetch(`/users/${userId}/connect-device`, {
      method: "POST",
      body: { device_id: deviceId },
    }),

  // POST /users/:id/disconnect-device - Disconnect user from device (Admin only)
  disconnectDevice: (userId: string) =>
    apiFetch(`/users/${userId}/disconnect-device`, {
      method: "POST",
    }),
};
