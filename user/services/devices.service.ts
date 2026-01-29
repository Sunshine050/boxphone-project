import { apiFetch } from "./api";

export const DevicesService = {
  // GET /devices - Get all devices (available for user)
  getAll: () => apiFetch("/devices"),

  // GET /devices/:id - Get device by ID
  getById: (id: string) => apiFetch(`/devices/${id}`),
};
