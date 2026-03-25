import type { DateRange } from "react-day-picker";
import { endOfDay, isWithinInterval, startOfDay } from "date-fns";
import type { AdminLog } from "@/types/log";

/** Filter by calendar range (local day boundaries). No `from` = no date filter. */
export function logMatchesDateRange(
  log: AdminLog,
  range: DateRange | undefined,
): boolean {
  if (!range?.from) return true;
  const t = new Date(log.createdAt);
  if (Number.isNaN(t.getTime())) return false;
  const start = startOfDay(range.from);
  const end = range.to ? endOfDay(range.to) : endOfDay(range.from);
  return isWithinInterval(t, { start, end });
}

/** Thai + ISO date/time variants for flexible search (day, month, year, time). */
export function buildLogDateSearchBlob(createdAt: string): string {
  const d = new Date(createdAt);
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

  const blob = `${textBlob} ${buildLogDateSearchBlob(log.createdAt)}`;

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
    rows.push([
      new Date(log.createdAt).toISOString(),
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
