/**
 * แปลงจำนวนวินาทีเป็นข้อความภาษาไทยแบบย่อ
 * - แสดงเฉพาะหน่วยที่มีค่า > 0
 * - เมื่อเหลือ < 1 ชั่วโมง: แสดงวินาทีด้วย (ความละเอียดสำคัญตอนใกล้หมดเวลา)
 * - เมื่อ >= 1 ชั่วโมง: แสดงหน่วยใหญ่สุดถึง "น." (นาที) — วินาทีถูก round ทิ้ง
 *
 * ตัวอย่าง:
 *   formatDurationThai(0)          → "หมดเวลา"
 *   formatDurationThai(45)         → "45 วิ."
 *   formatDurationThai(90)         → "1 น. 30 วิ."
 *   formatDurationThai(3600)       → "1 ชม."
 *   formatDurationThai(3690)       → "1 ชม. 1 น."
 *   formatDurationThai(90061)      → "1 วัน 1 ชม. 1 น."
 *   formatDurationThai(31537800)   → "1 ปี 30 น."
 */
export function formatDurationThai(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  if (sec === 0) return "หมดเวลา";

  const SEC_PER_MIN = 60;
  const SEC_PER_HOUR = 60 * SEC_PER_MIN;
  const SEC_PER_DAY = 24 * SEC_PER_HOUR;
  const SEC_PER_YEAR = 365 * SEC_PER_DAY;

  const years = Math.floor(sec / SEC_PER_YEAR);
  let rest = sec - years * SEC_PER_YEAR;
  const days = Math.floor(rest / SEC_PER_DAY);
  rest -= days * SEC_PER_DAY;
  const hours = Math.floor(rest / SEC_PER_HOUR);
  rest -= hours * SEC_PER_HOUR;
  const minutes = Math.floor(rest / SEC_PER_MIN);
  const seconds = rest - minutes * SEC_PER_MIN;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ปี`);
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชม.`);
  if (minutes > 0) parts.push(`${minutes} น.`);
  // แสดงวินาทีเฉพาะเมื่อ total < 1 ชั่วโมง (ค่าวินาทียังมีนัยสำคัญ)
  if (sec < SEC_PER_HOUR && seconds > 0) {
    parts.push(`${seconds} วิ.`);
  }

  // กรณี edge — เช่น 60 sec → minutes=1, seconds=0, hours=0 → "1 น." (parts มี)
  // หรือ 0 sec ผ่านมาแล้ว
  if (parts.length === 0) {
    // เกิดเมื่อ sec อยู่ระหว่าง 1-59 แต่หลุดเงื่อนไข — กันไว้กลับเป็นวินาที
    return `${sec} วิ.`;
  }

  return parts.join(" ");
}
