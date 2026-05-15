/**
 * Cookie helpers for user panel.
 * access_token is now HttpOnly (set by backend) — JS cannot read it.
 * Only the CSRF token is accessible from JS for the double-submit pattern.
 */

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(^|\s)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[2].trim()) : null;
}

/** Check if the user likely has an active session (csrf_token exists alongside the HttpOnly access_token) */
export function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('csrf_token=');
}

/** Clear client-readable cookies on logout (backend clears HttpOnly ones via /auth/logout) */
export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

// ---- Legacy aliases (kept temporarily so existing imports don't break during migration) ----
/** @deprecated Token is now HttpOnly. Use hasAuthCookie() to check session. */
export function getToken(): string | null {
  return null;
}

/** @deprecated Token is now set by backend as HttpOnly cookie. */
export function setToken(_value: string): void {
  // no-op
}

/** @deprecated Use clearAuthCookies() */
export function removeToken(): void {
  clearAuthCookies();
}
