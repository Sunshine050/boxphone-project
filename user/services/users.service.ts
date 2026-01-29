import { apiFetch } from "./api";

export const UsersService = {
  // GET /users/me - Get current user profile
  getMe: () => apiFetch("/users/me"),
};
