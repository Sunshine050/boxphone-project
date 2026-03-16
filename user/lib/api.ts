import { getToken, removeToken } from "@/lib/cookies";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL
) as string;

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured");
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface FetchOptions {
  method?: HttpMethod;
  body?: any;
  auth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = typeof window !== "undefined" ? getToken() : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      // 🎯 ป้องกันการส่ง request ไปทั้งที่ไม่มี token (ถ้า auth=true)
      console.warn(`No token found for authenticated request to: ${path}`);
    }
  }

  // 🎯 แก้ไขเรื่อง Slash (/) ซ้ำซ้อน: ตรวจสอบว่า BASE_URL ลงท้ายด้วย / หรือไม่
  const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  const res = await fetch(`${cleanBaseUrl}${cleanPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      removeToken();
    }
    
    let message = "API Error";
    try {
      const err = await res.json();
      message = err.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}