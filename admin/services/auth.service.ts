import { apiFetch } from './api';
import { clearAuthCookies } from '@/lib/cookies';

export const AuthService = {
  login: (payload: { username: string; password: string }) =>
    apiFetch<{ user: { id: string; username: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: payload,
    }),

  /**
   * Always clears client-readable cookies, even if the backend call fails.
   * Callers should still redirect to /login (and ideally hard-reload) afterwards.
   */
  logout: async () => {
    try {
      await apiFetch<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // backend may be unreachable — proceed with client cleanup regardless
    }
    clearAuthCookies();
    return { message: 'logged out' };
  },

  me: () =>
    apiFetch<{ user: { id: string; username: string; role: string } }>('/auth/me'),

  register: (payload: any) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: payload,
    }),
};
