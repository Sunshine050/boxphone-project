import { apiFetch } from './api';

export const AuthService = {
  login: (payload: { username: string; password: string }) =>
    apiFetch<{ user: { id: string; username: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: payload,
    }),

  logout: () =>
    apiFetch<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () =>
    apiFetch<{ user: { id: string; username: string; role: string } }>('/auth/me'),

  register: (payload: any) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: payload,
    }),
};
