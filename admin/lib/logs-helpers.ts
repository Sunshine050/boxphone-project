import type { DateRange } from "react-day-picker";
import type { AdminLog } from "@/types/log";

type LogWithLegacy = AdminLog & { created_at?: unknown; _id?: unknown };

/** Mongo ObjectId → creation time (ms). */
function objectIdToTimestampMs(id: unknown): number | null {
  let hex: string | undefined;
  if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)) {
    hex = id;
  } else if (
    typeof id === "object" &&
    id !== null &&
    "$oid" in id &&
    typeof (id as { $oid: string }).$oid === "string" &&
    /^[a-f0-9]{24}$/i.test((id as { $oid: string }).$oid)
  ) {
    hex = (id as { $oid: string }).$oid;
  }
  if (!hex) return null;
  const sec = Number.parseInt(hex.slice(0, 8), 16);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return sec * 1000;
}

/** Parse API / DB timestamp shapes to epoch ms. */
function coerceTimestampMs(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return null;
      const ms = Math.abs(n) < 1e12 ? n * 1000 : n;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : ms;
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    const ms = Math.abs(raw) < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : ms;
  }
  if (raw instanceof Date) {
    const x = raw.getTime();
    return Number.isNaN(x) ? null : x;
  }
  if (typeof raw === "object" && raw !== null && "$numberLong" in raw) {
    const s = String((raw as { $numberLong: unknown }).$numberLong);
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const ms = Math.abs(n) < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : ms;
  }
  if (typeof raw === "object" && raw !== null && "$date" in raw) {
    return coerceTimestampMs((raw as { $date: unknown }).$date);
  }
  return null;
}

/** Milliseconds since epoch for log time, or null if missing/invalid. */
export function getLogTimeMs(log: AdminLog): number | null {
  const l = log as LogWithLegacy;
  for (const candidate of [l.createdAt, l.created_at]) {
    const ms = coerceTimestampMs(candidate as unknown);
    if (ms != null) return ms;
  }
  return objectIdToTimestampMs(l._id);
}

/** Calendar day bounds using local Y/M/D (matches react-day-picker v9 “calendar” dates). */
function localDayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function localDayEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function localAtClock(d: Date, hours: number, minutes: number, sec: number, ms: number): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    hours,
    minutes,
    sec,
    ms,
  );
}

/** Filter by calendar range (local day boundaries). No `from` = no date filter. */
export function logMatchesDateRange(
  log: AdminLog,
  range: DateRange | undefined,
): boolean {
  if (!range?.from) return true;
  const t = getLogTimeMs(log);
  if (t === null) return false;
  const start = localDayStart(range.from).getTime();
  const end = range.to
    ? localDayEnd(range.to).getTime()
    : localDayEnd(range.from).getTime();
  return t >= start && t <= end;
}

/** Normalize HTML time input / browser values to `HH:mm` (handles `09:00:00`, `9:5`, etc.). */
export function normalizeTimeInput(raw: string): string {
  const s = raw?.trim() ?? "";
  if (!s) return "";
  const parts = s.split(":");
  if (parts.length < 2) return "";
  const h = Number.parseInt(parts[0] ?? "", 10);
  const m = Number.parseInt(parts[1] ?? "", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const hh = Math.min(23, Math.max(0, h));
  const mm = Math.min(59, Math.max(0, m));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function parseTimeHM(s: string | undefined): { h: number; m: number } | null {
  const n = normalizeTimeInput(s ?? "");
  if (!n) return null;
  const parts = n.split(":");
  const h = Number.parseInt(parts[0]!, 10);
  const min = Number.parseInt(parts[1]!, 10);
  return { h, m: min };
}

/**
 * Narrow logs by local clock time on each day within the selected date range.
 * Multi-day + time = same clock window applied per calendar day (not one continuous span).
 * No `from` date: if no time set, no filter; if time set without date, no rows match.
 * No time strings: same as {@link logMatchesDateRange}.
 */
export function logMatchesDateTimeRange(
  log: AdminLog,
  range: DateRange | undefined,
  timeStart: string | undefined,
  timeEnd: string | undefined,
): boolean {
  const normStart = normalizeTimeInput(timeStart ?? "");
  const normEnd = normalizeTimeInput(timeEnd ?? "");
  const hasTime = normStart !== "" || normEnd !== "";

  if (!range?.from) {
    if (hasTime) return false;
    return true;
  }

  const t = getLogTimeMs(log);
  if (t === null) return false;

  if (!hasTime) {
    return logMatchesDateRange(log, range);
  }

  if (!logMatchesDateRange(log, range)) return false;

  const ts = parseTimeHM(normStart);
  const te = parseTimeHM(normEnd);
  const logDay = new Date(t);

  let windowStart = ts
    ? localAtClock(logDay, ts.h, ts.m, 0, 0)
    : localDayStart(logDay);

  let windowEnd = te
    ? localAtClock(logDay, te.h, te.m, 59, 999)
    : localDayEnd(logDay);

  if (windowEnd.getTime() < windowStart.getTime()) {
    const tmp = windowStart;
    windowStart = windowEnd;
    windowEnd = tmp;
  }

  return t >= windowStart.getTime() && t <= windowEnd.getTime();
}

/** Thai + ISO date/time variants for flexible search (day, month, year, time). */
export function buildLogDateSearchBlob(createdAt: string | undefined): string {
  const d = new Date(createdAt ?? "");
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const be = y + 543;
  const hh = d.getHours();
  const mm = d.getMinutes();
  const ss = d.getSeconds();

  const thShort = d.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
  });
  const thFull = d.toLocaleString("th-TH", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  const parts = [
    d.toISOString(),
    thShort,
    thFull,
    `${pad(day)}/${pad(m)}/${y}`,
    `${pad(day)}/${pad(m)}/${be}`,
    `${day}/${m}/${y}`,
    `${day}/${m}/${be}`,
    `${y}-${pad(m)}-${pad(day)}`,
    String(y),
    String(be),
    String(m),
    pad(m),
    String(day),
    pad(day),
    String(hh),
    pad(hh),
    String(mm),
    pad(mm),
    String(ss),
    pad(ss),
    `${pad(hh)}:${pad(mm)}:${pad(ss)}`,
    `${pad(hh)}:${pad(mm)}`,
  ];

  return parts.join(" ").toLowerCase();
}

export function logMatchesSearchQuery(log: AdminLog, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const textBlob = [
    log.message,
    log.target_user_id?.username,
    log.target_user_id?.name,
    log.target_device_id?.name,
    log.type,
    log.level,
    log.admin_username || "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const ms = getLogTimeMs(log);
  const createdIso =
    ms != null ? new Date(ms).toISOString() : String((log as LogWithLegacy).createdAt ?? "");
  const blob = `${textBlob} ${buildLogDateSearchBlob(createdIso)}`;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return blob.includes(q);
  return tokens.every((t) => blob.includes(t));
}

function csvEscape(cell: string): string {
  return `"${cell.replace(/"/g, '""')}"`;
}

export function downloadLogsCsv(logs: AdminLog[], filename: string): void {
  const header = [
    "createdAt",
    "type",
    "level",
    "message",
    "username",
    "device",
    "admin",
  ];
  const rows: string[][] = [header];
  for (const log of logs) {
    const ms = getLogTimeMs(log);
    rows.push([
      ms != null ? new Date(ms).toISOString() : "",
      log.type,
      log.level,
      log.message,
      log.target_user_id?.username || "",
      log.target_device_id?.name || "",
      log.admin_username || "",
    ]);
  }
  const BOM = "\uFEFF";
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([BOM + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
