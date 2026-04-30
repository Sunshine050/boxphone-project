const seen = new Map<string, number>();

const WINDOW_MS = parseInt(process.env.DEDUP_WINDOW_MS ?? '60000', 10);

function cleanup(): void {
  const now = Date.now();
  for (const [id, ts] of seen) {
    if (now - ts > WINDOW_MS) seen.delete(id);
  }
}

// Purge stale entries every minute to prevent unbounded memory growth
setInterval(cleanup, 60_000).unref();

export function isDuplicate(eventId: string): boolean {
  const now = Date.now();
  const last = seen.get(eventId);
  if (last !== undefined && now - last <= WINDOW_MS) return true;
  seen.set(eventId, now);
  return false;
}
