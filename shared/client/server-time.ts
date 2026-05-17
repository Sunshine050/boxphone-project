/**
 * Server time synchronization helper.
 *
 * Browser clocks can drift (timezone, NTP failures, user changed clock). We
 * compute an offset between the server's epoch_ms and the browser's Date.now()
 * once on app start (and periodically), then use it for every countdown so
 * the displayed remaining time stays in sync with what the backend believes.
 *
 * Usage:
 *   await syncServerTime(apiBaseUrl);    // call once on app mount
 *   const now = getServerNow();          // replaces Date.now() in countdowns
 */

let offsetMs = 0;
let lastSyncAt = 0;

/** Re-sync if last sync was more than this old. */
const STALE_AFTER_MS = 10 * 60 * 1000; // 10 min

/**
 * Fetch /time from backend and update the local offset.
 * Silently no-ops on network failure — keeps last known offset.
 * RTT is split symmetrically: we treat server time as midpoint between request
 * and response, which usually keeps the offset within ±50ms of reality.
 */
export async function syncServerTime(apiBaseUrl: string): Promise<void> {
  const base = apiBaseUrl.replace(/\/+$/, "");
  if (!base) return;
  try {
    const t0 = Date.now();
    const res = await fetch(`${base}/time`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return;
    const t1 = Date.now();
    const data = (await res.json()) as { epoch_ms?: number };
    if (typeof data?.epoch_ms !== "number") return;
    const rtt = t1 - t0;
    const serverNowAtArrival = data.epoch_ms + rtt / 2;
    offsetMs = serverNowAtArrival - t1;
    lastSyncAt = t1;
  } catch {
    // Network / parse failure — preserve previous offset.
  }
}

/** Current wall-clock time in ms, corrected against server clock. */
export function getServerNow(): number {
  return Date.now() + offsetMs;
}

/** True if we haven't synced within STALE_AFTER_MS. Callers may trigger a re-sync. */
export function shouldResync(): boolean {
  return lastSyncAt === 0 || Date.now() - lastSyncAt > STALE_AFTER_MS;
}

/** Inspect offset for debugging — positive means server is ahead of browser. */
export function getOffsetMs(): number {
  return offsetMs;
}
