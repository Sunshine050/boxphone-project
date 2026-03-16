// User Panel API Service
// Uses environment variable for BASE_URL, no hardcode
import { getToken, removeToken } from "@/lib/cookies";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_BACKEND_URL must be configured");
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface FetchOptions {
  method?: HttpMethod;
  body?: any;
  token?: string;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = "GET", body } = options;

  const token = typeof window !== "undefined" ? getToken() : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add token for authenticated requests (except auth endpoints)
  if (token && !path.startsWith("/auth/")) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      removeToken();
    }
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "API Error");
  }

  return res.json();
}
