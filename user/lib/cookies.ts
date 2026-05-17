/**
 * Cookie helpers for user panel.
 * access_token is HttpOnly (set by backend) — JS cannot read it but the backend
 * clears it via Set-Cookie on /auth/logout. This file handles client-readable
 * cookies and defensive cleanup in case the backend call fails.
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

/**
 * Best-effort clear a cookie from JS across every domain/path combo the backend
 * might have used (no domain, current host, every parent host). HttpOnly cookies
 * will resist — those rely on the backend's clearCookie response.
 */
function clearCookieAllVariants(name: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const host = window.location.hostname;
  const parts = host.split('.');
  const domains: string[] = ['', host];
  // Build parent-domain variants: a.b.c.com → .b.c.com, .c.com
  for (let i = 1; i < parts.length - 1; i++) {
    domains.push('.' + parts.slice(i).join('.'));
  }
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
  for (const domain of domains) {
    const suffix = domain ? `; domain=${domain}` : '';
    document.cookie = `${name}=; path=/; expires=${expires}${suffix}`;
  }
}

/**
 * Defensive cleanup of auth-related cookies on the client.
 * The authoritative clear happens via backend /auth/logout (which sets clearCookie
 * headers for the HttpOnly access_token). This is a safety net for the case where
 * the backend call fails or the cookie was set with a different domain.
 */
export function clearAuthCookies(): void {
  clearCookieAllVariants('csrf_token');
  clearCookieAllVariants('access_token');
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
