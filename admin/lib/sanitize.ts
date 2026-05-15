/**
 * ป้องกัน XSS / injection ใน frontend (admin)
 * ใช้กับข้อความจาก user หรือ API ก่อนแสดงใน attribute หรือเมื่อต้อง escape
 */

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

export function escapeHtml(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  return str.replace(/[&<>"'/]/g, (c) => ENTITIES[c] ?? c);
}

/** คืนค่าสตริงที่ปลอดภัยสำหรับแสดง (ตัดความยาวและ trim) */
export function safeDisplay(value: unknown, maxLength = 500): string {
  if (value == null) return "";
  const s = String(value).trim().slice(0, maxLength);
  return escapeHtml(s);
}

/** ตรวจว่า URL ปลอดภัย (ไม่ใช่ javascript: หรือ data:) */
export function isSafeUrl(url: unknown): boolean {
  if (url == null || typeof url !== "string") return false;
  const t = url.trim().toLowerCase();
  return !t.startsWith("javascript:") && !t.startsWith("data:");
}
