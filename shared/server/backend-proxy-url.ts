/** Server-only: upstream URL for Next.js /api/proxy routes (not exposed to the browser). */
export function getBackendProxyUrl(): string {
  const raw =
    process.env.BACKEND_PROXY_URL?.trim() ||
    process.env.BACKEND_INTERNAL_URL?.trim() ||
    'http://127.0.0.1:3031';

  return raw.replace(/\/+$/, '');
}

export function isLocalBackendUrl(baseUrl: string): boolean {
  try {
    const { hostname } = new URL(baseUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}
