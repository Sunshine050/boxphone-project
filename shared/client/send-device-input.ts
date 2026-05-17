export type DeviceInputType = "tap" | "swipe" | "touch" | "key" | "text";

export type DeviceInputPayload = Record<string, unknown>;

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
  const base = apiBaseUrl.replace(/\/$/, "");
  const csrf = getCsrfToken();

  const promise = fetch(`${base}/devices/${deviceId}/input`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    keepalive: type === "touch",
    body: JSON.stringify({ type, payload }),
  });

  if (options?.awaitResponse) {
    return promise;
  }

  void promise.catch(() => {
    /* ignore transient network errors during drag */
  });
}
