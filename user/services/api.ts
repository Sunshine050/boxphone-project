import { getCsrfToken } from '@/lib/cookies';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_BACKEND_URL must be configured');
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface FetchOptions {
  method?: HttpMethod;
  body?: any;
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

  const res = await fetch(`${BASE_URL}${path}`, {
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
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'API Error');
  }

  return res.json();
}
