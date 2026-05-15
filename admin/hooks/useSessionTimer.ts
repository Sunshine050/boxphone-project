"use client";

import { useEffect, useMemo, useState } from "react";

export type SessionTimerInput = {
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "FINISHED";
  remaining_seconds: number;
  start_time?: string | Date | null;
  resume_time?: string | Date | null;
};

function toDate(v?: string | Date | null) {
  if (!v) return null;
  return v instanceof Date ? v : new Date(v);
}

export function useSessionTimer(session?: SessionTimerInput | null) {
  const [now, setNow] = useState(() => Date.now());

  // re-render only (ไม่ใช่คำนวณเอง)
  useEffect(() => {
    if (!session) return;
    if (session.status !== "ACTIVE") return;

    const t = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(t);
  }, [session?.status]);

  const remaining = useMemo(() => {
    if (!session) return 0;

    const stored = session.remaining_seconds || 0;

    // PAUSED → freeze
    if (session.status === "PAUSED") return stored;

    // FINISHED/CANCELLED → 0
    if (session.status === "FINISHED" || session.status === "CANCELLED")
      return 0;

    // ACTIVE → คำนวณจาก backend time
    const start = toDate(session.resume_time) || toDate(session.start_time);
    if (!start) return stored;

    const diff = Math.floor((now - start.getTime()) / 1000);
    return Math.max(0, stored - diff);
  }, [session, now]);

  return remaining;
}