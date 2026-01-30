import { apiFetch } from "@/lib/api";

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

    localStorage.setItem("access_token", res.access_token);
    localStorage.setItem("user", JSON.stringify(res.user));

    return res.user;
  },

  getUser() {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  },
};
