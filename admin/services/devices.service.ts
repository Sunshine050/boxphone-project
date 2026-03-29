import { apiFetch, BASE_URL } from "./api";

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

  /** Mark device: แจ้งซ่อม (UNDER_REPAIR) / ชำรุด (DAMAGED) / รอล้างข้อมูล (QUARANTINE) / คืนสถานะ (AVAILABLE) */
  markStatus: (id: string, status: "UNDER_REPAIR" | "DAMAGED" | "AVAILABLE" | "QUARANTINE"): Promise<any> =>
    apiFetch<any>(`/devices/${id}/mark-status`, {
      method: "PATCH",
      body: { status },
    }),

  delete: (id: string): Promise<any> =>
    apiFetch<any>(`/devices/${id}`, {
      method: "DELETE",
    }),

  /**
   * ดึงหน้าจอจากเสี่ยวเหว๋ยตาม device ID
   * @returns URL สำหรับแสดงภาพหน้าจอ
   */
  getScreenshotUrl: (deviceId: string): string => {
    return `${BASE_URL}/devices/${deviceId}/screenshot?t=${Date.now()}`;
  },

  /**
   * ดึงหน้าจอจากเสี่ยวเหว๋ยตาม serial number
   * @returns URL สำหรับแสดงภาพหน้าจอ
   */
  getScreenshotUrlBySerial: (serialNumber: string): string => {
    return `${BASE_URL}/devices/screenshot?serial=${encodeURIComponent(serialNumber)}&t=${Date.now()}`;
  },

  /**
   * Sync devices จากเสี่ยวเหว๋ย
   */
  syncFromXiaowei: (): Promise<any> =>
    apiFetch<any>("/devices/sync-from-xiaowei", {
      method: "GET",
    }),
};
