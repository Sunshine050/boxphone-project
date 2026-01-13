import { apiFetch } from "./api";

export const DevicesService = {
  getAll: () => apiFetch("/devices"),

  getById: (id: string) => apiFetch(`/devices/${id}`),

  create: (payload: any) =>
    apiFetch("/devices", {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: any) =>
    apiFetch(`/devices/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  delete: (id: string) =>
    apiFetch(`/devices/${id}`, {
      method: "DELETE",
    }),
};
