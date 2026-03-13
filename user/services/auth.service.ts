import { apiFetch } from "@/lib/api";
import { setToken, clearAuthCookies } from "@/lib/cookies";

export const AuthService = {
  async login(username: string, password: string) {
    const res = await apiFetch<{
      access_token: string;
      user: { id: string; username: string; role: string };
    }>("/auth/login", {
      method: "POST",
      body: { username, password },
      auth: false, // ❗ login ไม่มี token
    });

    setToken(res.access_token);
    localStorage.setItem("user", JSON.stringify(res.user));

    return res.user;
  },

  getUser() {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },

  logout() {
    clearAuthCookies();
    localStorage.removeItem("user");
  },
};
