import { getCsrfToken } from '@/lib/cookies';

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL
) as string;

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL must be configured');
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface FetchOptions {
  method?: HttpMethod;
  body?: any;
  auth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = 'GET', body } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const csrfToken = typeof window !== 'undefined' ? getCsrfToken() : null;
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  const res = await fetch(`${cleanBaseUrl}${cleanPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    let message = 'API Error';
    try {
      const err = await res.json();
      message = err.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}
