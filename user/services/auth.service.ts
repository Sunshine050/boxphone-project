import { apiFetch } from '@/lib/api';
import { clearAuthCookies } from '@/lib/cookies';

export const AuthService = {
  async login(username: string, password: string) {
    const res = await apiFetch<{
      user: { id: string; username: string; role: string };
    }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });

    return res.user;
  },

  async me() {
    const res = await apiFetch<{
      user: { id: string; username: string; role: string };
    }>('/auth/me');
    return res.user;
  },

  async logout() {
    try {
      await apiFetch<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // even if backend call fails, clear client state
    }
    clearAuthCookies();
  },
};
