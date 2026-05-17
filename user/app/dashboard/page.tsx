"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getNotificationSocket } from "@/lib/socket-client";
import { playNotificationSound } from "@/lib/notification-sound";
import { toast } from "sonner";
import { SessionDashboard } from "@/components/session-dashboard";
import type { Session } from "@/types/session";
import { getApiBaseUrl } from "@boxphon/shared/client/api-base-url";
import { syncServerTime } from "@boxphon/shared/client/server-time";

export type { Session };

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(
    Date.now(),
  );
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiFetch<Session[] | null>("/sessions/me");
      setSessions(data ?? []);
      setLastSyncTimestamp(Date.now());
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading...
      </div>
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
