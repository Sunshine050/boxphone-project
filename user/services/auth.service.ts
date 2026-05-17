import { apiFetch } from '@/lib/api';
import { clearAuthCookies } from '@/lib/cookies';
import { closeAllSockets } from '@/lib/socket-client';

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
    // Tear down sockets first so the backend doesn't keep a stale stream open
    // after the user's session is invalidated.
    try {
      closeAllSockets();
    } catch {
      // ignore — socket may already be disconnected
    }
    try {
      await apiFetch<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // backend may be unreachable — proceed with client cleanup regardless
    }
    clearAuthCookies();
  },
};
