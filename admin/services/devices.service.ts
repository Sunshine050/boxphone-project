import { apiFetch } from "./api";

export const DevicesService = {
  getAll: (): Promise<any[]> => apiFetch<any[]>("/devices"),

  getById: (id: string): Promise<any> => apiFetch<any>(`/devices/${id}`),

  create: (payload: any): Promise<any> =>
    apiFetch<any>("/devices", {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: any): Promise<any> =>
    apiFetch<any>(`/devices/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  delete: (id: string): Promise<any> =>
    apiFetch<any>(`/devices/${id}`, {
      method: "DELETE",
    }),
};
