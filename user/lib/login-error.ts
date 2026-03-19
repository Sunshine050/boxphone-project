/**
 * แปลง error จาก API เป็นข้อความที่ปลอดภัยสำหรับแสดงบนหน้า login
 * ไม่แสดงข้อความจาก backend โดยตรง (กัน injection / ข้อมูลรั่ว)
 */
export function getSafeLoginErrorMessage(err: unknown): string {
  if (!err) return "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
  const msg = typeof (err as any)?.message === "string" ? (err as any).message : "";
  const lower = msg.toLowerCase();
  if (
    lower.includes("invalid credentials") ||
    lower.includes("unauthorized") ||
    lower.includes("ชื่อผู้ใช้") ||
    lower.includes("รหัสผ่าน")
  ) {
    return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  }
  if (lower.includes("too many") || lower.includes("throttle") || lower.includes("try again in")) {
    return "คุณลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("เชื่อมต่อ")) {
    return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่";
  }
  return "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
}

/** trim และจำกัดความยาวก่อนส่ง login (กัน injection / payload ใหญ่) */
export function sanitizeLoginInput(username: string, password: string): { username: string; password: string } {
  const u = typeof username === "string" ? username.replace(/\0/g, "").trim().slice(0, 256) : "";
  const p = typeof password === "string" ? password.slice(0, 512) : "";
  return { username: u, password: p };
}
