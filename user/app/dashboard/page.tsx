"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getNotificationSocket } from "@/lib/socket-client";
import { playNotificationSound } from "@/lib/notification-sound";
import { toast } from "sonner";
import { SessionDashboard } from "@/components/session-dashboard";
import type { Session } from "@/types/session";
import { getApiBaseUrl } from "@boxphon/shared/client/api-base-url";
import { syncServerTime, getServerNow } from "@boxphon/shared/client/server-time";

export type { Session };

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(
    Date.now(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const discord = searchParams.get("discord");
    if (discord === "success") {
      toast.success("เชื่อมต่อ Discord สำเร็จ!", {
        description: "คุณจะได้รับการแจ้งเตือนทาง Discord แล้ว",
        duration: 5000,
      });
      router.replace("/dashboard");
    } else if (discord === "error") {
      toast.error("เชื่อมต่อ Discord ไม่สำเร็จ", {
        description: "กรุณาลองใหม่อีกครั้ง",
        duration: 5000,
      });
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiFetch<Session[] | null>("/sessions/me");
      setSessions(data ?? []);
      // Use server-corrected clock so the countdown baseline matches
      // the server's own clock (avoids user-side timer running fast/slow).
      setLastSyncTimestamp(getServerNow());
      setLoading(false);
    } catch {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    loadSessions();

    // Sync client clock against server clock so countdowns don't drift if the
    // user's machine clock is wrong. Re-syncs every 5 minutes.
    // The first sync forces a sessions reload so that remaining_seconds and
    // the corrected now() both come from server time at the same moment.
    const apiBase = getApiBaseUrl();
    syncServerTime(apiBase).then(() => loadSessions());
    const syncTimer = setInterval(() => {
      syncServerTime(apiBase).then(() => loadSessions());
    }, 5 * 60 * 1000);

    let cancelled = false;
    let socket: ReturnType<typeof getNotificationSocket> | null = null;

    apiFetch<{ user: { id: string; username: string; role: string } }>(
      "/auth/me",
    )
      .then((res) => {
        if (cancelled || !res.user?.id) return;

        // Backend authenticates the socket from the HttpOnly access_token cookie
        // (withCredentials is set inside getNotificationSocket). No need to
        // surface the JWT to JS.
        socket = getNotificationSocket();

        socket.on("new_notification", (data: any) => {
          playNotificationSound();
          toast[
            data.type === "WARNING" || data.type === "DANGER"
              ? "error"
              : "success"
          ](data.title ?? "แจ้งเตือน", {
            description: data.message,
            duration: 5000,
          });
        });

        socket.on("session_updated", () => {
          loadSessions();
        });
      })
      .catch((e) => {
        console.error("Socket init error:", e);
      });

    return () => {
      cancelled = true;
      clearInterval(syncTimer);
      if (socket) {
        socket.off("new_notification");
        socket.off("session_updated");
        socket.disconnect();
      }
    };
  }, [loadSessions]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadSessions();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadSessions]);

  if (loading) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col items-center justify-center gap-4 text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-12 w-12 rounded-full border-4 border-cyan-500 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
        />
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-slate-400"
        >
          กำลังโหลดอุปกรณ์...
        </motion.p>
      </motion.div>
    );
  }

  return (
    <SessionDashboard
      initialSessions={sessions}
      lastSyncTimestamp={lastSyncTimestamp}
      refreshData={loadSessions}
    />
  );
}
