// src/services/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

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

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // ❗ login / register ไม่ต้องแนบ token
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
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "API Error");
  }

  return res.json();
}
