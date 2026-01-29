import { apiFetch } from "./api";

export const AuthService = {
  // POST /auth/login - Login
  login: (username: string, password: string) =>
    apiFetch<{ access_token: string; user: any }>("/auth/login", {
      method: "POST",
      body: { username, password },
    }),

  // POST /auth/register - Register (if available)
  register: (username: string, password: string, role: string = "USER") =>
    apiFetch("/auth/register", {
      method: "POST",
      body: { username, password, role },
    }),
};
