/**
 * ค่า Base URL ของ Backend สำหรับ admin / user (Next.js)
 * ตั้งใน .env.local — ลำดับความสำคัญเหมือนกันทั้งสองแอป
 */
export function getApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    '';

  if (!raw.trim()) {
    throw new Error(
      'ตั้ง NEXT_PUBLIC_API_BASE_URL (หรือ NEXT_PUBLIC_BACKEND_URL) ใน .env.local ให้ชี้ไปที่ Backend',
    );
  }

  return raw.replace(/\/+$/, '');
}

/**
 * Base URL for device input (tap/swipe/touch).
 * Prefer same-origin Next proxy so cookies + CSRF always work in production.
 */
export function getClientInputApiBase(fallback?: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/proxy`;
  }
  const raw = fallback?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  try {
    return getApiBaseUrl();
  } catch {
    return '';
  }
}
