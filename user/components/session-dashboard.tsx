"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { DiscordConnectButton } from "./discord-connect-button";
import type { Session } from "@/types/session";
import { AuthService } from "@/services/auth.service";
import { SessionPhoneControl } from "@/components/session-phone-control";

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
    transition: { type: "spring", stiffness: 320, damping: 28 },
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

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const expandedSession =
    sessions.find((s) => s._id === expandedSessionId) ?? null;

  useEffect(() => {
    if (!expandedSession) return;
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
  }, [expandedSession]);

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
      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-5 sm:py-6">
        <motion.header
          className="mb-6 flex items-center justify-between gap-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <h1 className="text-xl font-bold sm:text-2xl">CloudPhone Devices</h1>

          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell />

            <DiscordConnectButton />

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
          </div>
        </motion.header>

        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
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
            {sessions.map((s) => (
              <motion.div
                key={s._id}
                variants={cardVariants}
                layout
                className="flex w-full min-w-0 justify-center"
              >
                <SessionPhoneControl
                  session={s}
                  fetchedAt={lastSyncTimestamp}
                  onExpand={() => setExpandedSessionId(s._id)}
                  suppressStream={expandedSessionId === s._id}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {expandedSession && (
          <motion.div
            key="expanded-overlay"
            className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto bg-slate-950/85 px-4 pt-14 pb-6"
            style={{ isolation: "isolate" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setExpandedSessionId(null);
            }}
          >
            <motion.button
              type="button"
              aria-label="ปิดโหมดขยาย"
              onClick={() => setExpandedSessionId(null)}
              className="fixed right-4 top-4 z-[60] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              ปิด
            </motion.button>

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="w-full flex justify-center"
            >
              <SessionPhoneControl
                key={`expanded-${expandedSession._id}`}
                session={expandedSession}
                variant="expanded"
                fetchedAt={lastSyncTimestamp}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
