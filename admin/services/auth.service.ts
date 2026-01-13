import { apiFetch } from "./api";

export const AuthService = {
  login: (payload: { username: string; password: string }) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: payload,
    }),

  register: (payload: any) =>
    apiFetch("/auth/register", {
      method: "POST",
      body: payload,
    }),
};
