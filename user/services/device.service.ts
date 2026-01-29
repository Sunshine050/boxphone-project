import { apiFetch } from "@/lib/api";

export const DeviceService = {
  async getAvailable() {
    const devices = await apiFetch<any[]>("/devices");
    return devices.filter(
      (d) => d.status === "AVAILABLE"
    );
  },
};
