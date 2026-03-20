/** ตรวจว่า buffer เป็น PNG ตาม magic bytes หรือไม่ */
export function isPngImageBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}
