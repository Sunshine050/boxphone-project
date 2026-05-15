/**
 * ค่าคงที่สำหรับ screenshot pipeline (ADB)
 * โหลด override จาก env: SCREENSHOT_CACHE_TTL_MS, SCREENSHOT_MAX_CONCURRENT
 */

/** 1×1 PNG โปร่งใส — ส่งเป็น 200 เมื่อดึง screencap ไม่ได้ แทน error ฝั่ง client */
export const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export const DEFAULT_SCREENSHOT_CACHE_TTL_MS = 8000;
export const DEFAULT_SCREENSHOT_MAX_CONCURRENT = 2;
