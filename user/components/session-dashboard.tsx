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
import { cn } from "@/lib/utils";

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
        {expandedSessionId && (
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

      {expandedSessionId && (
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
          expandedSessionId && "pointer-events-none",
        )}
      >
        <motion.header
          className="mb-6 flex items-center justify-between gap-4 pointer-events-auto"
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
            {sessions.map((s) => {
              const isThisExpanded = expandedSessionId === s._id;
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
                      isThisExpanded
                        ? "pointer-events-auto fixed inset-x-0 top-14 bottom-6 z-50 flex items-start justify-center overflow-y-auto px-4"
                        : "relative",
                    )}
                    transition={{
                      layout: { type: "spring", stiffness: 380, damping: 36 },
                    }}
                  >
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
                    />
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
