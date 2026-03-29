/**
 * Match status ระหว่าง Backend กับ Frontend
 * Backend device schema: DeviceStatus.BUSY = 'INUSE' (เก็บใน DB เป็น "INUSE")
 * Frontend ใช้ "BUSY" สำหรับแสดงผล → ต้อง normalize ตอนรับจาก API
 */

export type DeviceStatusUI =
  | "AVAILABLE"
  | "BUSY"
  | "OFFLINE"
  | "UNDER_REPAIR"
  | "DAMAGED"
  | "QUARANTINE";

/**
 * แปลงค่าสถานะจาก API ให้ตรงกับที่ใช้ใน UI
 * - Backend ส่ง INUSE (จาก enum BUSY = 'INUSE') → ใช้ BUSY ใน UI
 */
export function normalizeDeviceStatus(status: unknown): DeviceStatusUI {
  const raw = String(status ?? "").trim().toUpperCase();
  if (raw === "AVAILABLE") return "AVAILABLE";
  if (raw === "INUSE" || raw === "BUSY" || raw === "ACTIVE") return "BUSY";
  if (raw === "OFFLINE") return "OFFLINE";
  if (raw === "UNDER_REPAIR") return "UNDER_REPAIR";
  if (raw === "DAMAGED") return "DAMAGED";
  if (raw === "QUARANTINE") return "QUARANTINE";
  return "OFFLINE";
}

/** สถานะสำหรับหน้า Overview (ภาพรวม): in-use | available | error | maintenance */
export type OverviewStatus = "in-use" | "available" | "error" | "maintenance";

/**
 * แปลง DeviceStatusUI → Overview status (สำหรับ filter และการ์ดภาพรวม)
 */
export function toOverviewStatus(ui: DeviceStatusUI): OverviewStatus {
  if (ui === "AVAILABLE") return "available";
  if (ui === "BUSY") return "in-use";
  if (ui === "UNDER_REPAIR" || ui === "DAMAGED" || ui === "QUARANTINE") return "maintenance";
  return "error"; // OFFLINE
}
