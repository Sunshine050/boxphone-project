export type DeviceInputType = "tap" | "swipe" | "touch" | "key" | "text";

export type DeviceInputPayload = Record<string, unknown>;

function resolveApiBase(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl?.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/proxy`;
  }
  return "";
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(^|\s)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[2].trim()) : null;
}

/**
 * Fire-and-forget device input (no await) for low-latency touch moves.
 * Returns the fetch promise when `awaitResponse` is true.
 */
export function sendDeviceInput(
  apiBaseUrl: string,
  deviceId: string,
  type: DeviceInputType,
  payload: DeviceInputPayload,
  options?: { awaitResponse?: boolean },
): Promise<Response> | void {
  const base = resolveApiBase(apiBaseUrl);
  if (!base) {
    if (options?.awaitResponse) {
      return Promise.reject(new Error("No API base URL for device input"));
    }
    return;
  }
  const csrf = getCsrfToken();

  const promise = fetch(`${base}/devices/${deviceId}/input`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    keepalive: type === "touch" || type === "tap",
    body: JSON.stringify({ type, payload }),
  });

  if (options?.awaitResponse) {
    return promise.then(async (res) => {
      if (!res.ok) {
        let message = `Input failed (${res.status})`;
        try {
          const data = await res.json();
          if (data?.message) message = String(data.message);
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      return res;
    });
  }

  void promise.catch(() => {
    /* ignore transient network errors during drag */
  });
}
