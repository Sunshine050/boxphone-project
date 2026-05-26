"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import type { Session } from "@/types/session";
import { AuthService } from "@/services/auth.service";
import { SessionPhoneControl } from "@/components/session-phone-control";
import {
  DEFAULT_SESSION_STREAM_VIEW,
  type SessionStreamViewState,
} from "@boxphon/shared/client/session-stream-view";
import { loadOrientationMode } from "@/lib/screen-orientation";
import { useMobileLandscape } from "@/hooks/use-mobile-landscape";
import { cn } from "@/lib/utils";
import { formatDurationThai } from "@boxphon/shared/client/format-duration";
import { getServerNow } from "@boxphon/shared/client/server-time";

const STAGGER_MAX_TOTAL_MS = 4000;
const STAGGER_STEP_MAX_MS = 500;

function staggerDelayMs(index: number, total: number): number {
  if (total <= 1 || index <= 0) return 0;
  const step = Math.min(
    STAGGER_STEP_MAX_MS,
    STAGGER_MAX_TOTAL_MS / (total - 1),
  );
  return Math.round(step * index);
}

/** Compact timer for card headers (matches session-phone-control). */
function formatDurationHeaderCompact(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  if (sec === 0) return "หมด";
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}ชม.${m}น` : `${h}ชม.`;
}

function SessionCardSkeleton({
  session,
  fetchedAt,
}: {
  session: Session;
  fetchedAt: number;
}) {
  const [now, setNow] = useState(() => getServerNow());

  useEffect(() => {
    const timer = setInterval(() => setNow(getServerNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  let remaining = session.remaining_seconds;
  if (session.status === "ACTIVE" && fetchedAt) {
    remaining = Math.max(
      0,
      session.remaining_seconds - Math.floor((now - fetchedAt) / 1000),
    );
  }
  const expired = session.status === "EXPIRED" || remaining <= 0;
  const isPaused = session.status === "PAUSED";
  const deviceName = session.device_id?.name || "Device";

  const remainingClassName = expired
    ? "text-red-400"
    : isPaused
      ? "text-amber-400"
      : "text-cyan-400";

  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col max-w-[min(calc(100vw-1.5rem),240px)] sm:max-w-[260px] md:max-w-[280px]">
      <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-2 shadow-lg shadow-black/20 sm:rounded-3xl sm:p-3 md:p-3.5">
        <div className="mb-2 flex min-w-0 items-center gap-1 border-b border-slate-800/90 pb-2 sm:mb-3 sm:gap-1.5 sm:pb-2.5">
          <span
            className="min-w-0 flex-1 truncate text-xs font-semibold text-white sm:text-sm"
            title={deviceName}
          >
            {deviceName}
          </span>
          <div
            className={`flex shrink-0 items-center font-bold tabular-nums leading-none ${remainingClassName}`}
          >
            <span className="text-[10px] sm:hidden">
              {formatDurationHeaderCompact(remaining)}
            </span>
            <span className="hidden whitespace-nowrap text-xs sm:inline md:text-sm">
              {formatDurationThai(remaining)}
            </span>
          </div>
        </div>
        <div
          className="relative mx-auto w-full min-w-0 overflow-hidden rounded-[1.75rem] border-[3px] border-slate-700 bg-slate-900 shadow-xl sm:rounded-[2rem] sm:border-4 md:rounded-[2.25rem]"
          style={{ aspectRatio: "9 / 19.5", maxHeight: "min(82vh, 720px)" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            <span className="text-xs text-slate-400">กำลังโหลดหน้าจอ...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface DashboardProps {
  initialSessions: Session[];
  lastSyncTimestamp: number;
  refreshData: () => Promise<void>;
}

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 320, damping: 28 },
  },
};

export function SessionDashboard({
  initialSessions,
  lastSyncTimestamp,
  refreshData: _refreshData,
}: DashboardProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );
  const [streamViews, setStreamViews] = useState<
    Record<string, SessionStreamViewState>
  >({});
  const [mountedCount, setMountedCount] = useState(() =>
    initialSessions.length <= 1 ? initialSessions.length : 0,
  );
  const isMobileLandscape = useMobileLandscape();

  const getStreamView = (sessionId: string): SessionStreamViewState =>
    streamViews[sessionId] ?? {
      ...DEFAULT_SESSION_STREAM_VIEW,
      orientationMode: loadOrientationMode(sessionId),
    };

  const patchStreamView = (
    sessionId: string,
    patch: Partial<SessionStreamViewState>,
  ) => {
    setStreamViews((prev) => {
      const current = prev[sessionId] ?? {
        ...DEFAULT_SESSION_STREAM_VIEW,
        orientationMode: loadOrientationMode(sessionId),
      };
      return { ...prev, [sessionId]: { ...current, ...patch } };
    });
  };

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    const n = sessions.length;
    if (n === 0) {
      setMountedCount(0);
      return;
    }
    if (n === 1) {
      setMountedCount(1);
      return;
    }
    setMountedCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) {
      timers.push(
        setTimeout(() => {
          setMountedCount((prev) => Math.max(prev, i + 1));
        }, staggerDelayMs(i, n)),
      );
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [sessions]);

  const hideDashboardChrome =
    isMobileLandscape &&
    (sessions.length === 1 || expandedSessionId !== null);

  useEffect(() => {
    if (!hideDashboardChrome) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [hideDashboardChrome]);

  useEffect(() => {
    if (!expandedSessionId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedSessionId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expandedSessionId]);

  const handleLogout = async () => {
    await AuthService.logout();
    window.location.replace("/login");
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <AnimatePresence>
        {expandedSessionId && !hideDashboardChrome && (
          <motion.div
            key="expanded-backdrop"
            className="fixed inset-0 z-40 bg-slate-950/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setExpandedSessionId(null)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {expandedSessionId && !hideDashboardChrome && (
        <button
          type="button"
          aria-label="ปิดโหมดขยาย"
          onClick={() => setExpandedSessionId(null)}
          className="fixed right-4 top-4 z-[60] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
        >
          ปิด
        </button>
      )}

      <motion.div
        className={cn(
          "mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-5 sm:py-6",
          expandedSessionId && !hideDashboardChrome && "pointer-events-none",
          hideDashboardChrome && "p-0",
        )}
      >
        <motion.header
          className={cn(
            "mb-6 flex items-center justify-between gap-4 pointer-events-auto",
            hideDashboardChrome && "hidden",
          )}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <h1 className="text-xl font-bold sm:text-2xl">CloudPhone Devices</h1>

          <motion.div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell />

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-700 hover:bg-slate-800"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  ออกจากระบบ
                </Button>
              </DialogTrigger>

              <DialogContent className="border-slate-800 bg-slate-900 text-white">
                <DialogHeader>
                  <DialogTitle>ยืนยันการออกจากระบบ</DialogTitle>
                </DialogHeader>

                <p className="mt-2 text-sm text-slate-400">
                  คุณต้องการออกจากระบบใช่หรือไม่? หากออกจากระบบแล้ว
                  จะต้องเข้าสู่ระบบใหม่อีกครั้ง
                </p>

                <DialogFooter className="mt-6 flex gap-3">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      className="border-slate-600 hover:bg-slate-800"
                    >
                      ยกเลิก
                    </Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={handleLogout}>
                    ออกจากระบบ
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>
        </motion.header>

        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="pointer-events-auto"
          >
            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-10 text-center text-slate-400">
                No active sessions assigned
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-6 xl:gap-y-10"
            variants={gridVariants}
            initial="hidden"
            animate="show"
          >
            {sessions.map((s, index) => {
              const isThisExpanded = expandedSessionId === s._id;
              const showControl = index < mountedCount;
              return (
                <motion.div
                  key={s._id}
                  variants={cardVariants}
                  layout="position"
                  className="flex w-full min-w-0 justify-center"
                >
                  {/* Hold grid cell size while card is position:fixed */}
                  {isThisExpanded && (
                    <motion.div
                      layout
                      className="pointer-events-none invisible w-full max-w-[min(calc(100vw-1.5rem),240px)] min-h-[380px] sm:max-w-[260px] md:max-w-[280px]"
                      aria-hidden
                    />
                  )}

                  {/* Same SessionPhoneControl instance — never unmounts on expand/collapse */}
                  <motion.div
                    layoutId={`phone-${s._id}`}
                    className={cn(
                      "phone-shell flex w-full min-w-0 justify-center",
                      isThisExpanded &&
                        !hideDashboardChrome &&
                        "pointer-events-auto fixed inset-x-0 top-14 bottom-6 z-50 flex items-start justify-center overflow-y-auto px-4",
                      isThisExpanded &&
                        hideDashboardChrome &&
                        "pointer-events-none fixed inset-0 z-40",
                      !isThisExpanded && "relative",
                    )}
                    transition={{
                      layout: { type: "spring", stiffness: 380, damping: 36 },
                    }}
                  >
                    {showControl ? (
                      <SessionPhoneControl
                        session={s}
                        fetchedAt={lastSyncTimestamp}
                        streamView={getStreamView(s._id)}
                        onStreamViewChange={(patch) =>
                          patchStreamView(s._id, patch)
                        }
                        variant={isThisExpanded ? "expanded" : "default"}
                        onExpand={() => setExpandedSessionId(s._id)}
                        onCollapse={() => setExpandedSessionId(null)}
                        allowMobileLandscapeFullscreen={
                          sessions.length === 1 || isThisExpanded
                        }
                      />
                    ) : (
                      <SessionCardSkeleton
                        session={s}
                        fetchedAt={lastSyncTimestamp}
                      />
                    )}
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
