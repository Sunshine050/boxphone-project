/**
 * เก็บ/อ่าน token จาก cookie (admin) — ใช้ชื่อแยกจาก user เพื่อไม่ให้ token ปนกัน
 */

const TOKEN_KEY = "admin_access_token";
const MAX_AGE_DAYS = 7;

export function setToken(value: string): void {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setDate(expires.getDate() + MAX_AGE_DAYS);
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  let cookie = `${TOKEN_KEY}=${encodeURIComponent(value)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
  if (secure) cookie += "; Secure";
  document.cookie = cookie;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|\\s)${TOKEN_KEY}=([^;]+)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[2].trim());
  } catch {
    return null;
  }
}

export function removeToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/** ลบ cookie ทั้ง admin และ user (ใช้ตอน logout เพื่อเคลียร์ทั้งหมด) */
export function clearAuthCookies(): void {
  removeToken();
  document.cookie = "user_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}
