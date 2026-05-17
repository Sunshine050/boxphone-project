"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { NotificationBell } from "./notification-bell";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-5 sm:py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold sm:text-2xl">CloudPhone Devices</h1>

          <div className="flex items-center gap-3 sm:gap-4">
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
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-10 text-center text-slate-400">
              No active sessions assigned
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-6 xl:gap-y-10">
            {sessions.map((s) => (
              <SessionPhoneControl
                key={s._id}
                session={s}
                fetchedAt={lastSyncTimestamp}
                onExpand={() => setExpandedSessionId(s._id)}
                suppressStream={expandedSessionId === s._id}
              />
            ))}
          </div>
        )}
      </div>

      {expandedSession && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto bg-slate-950/85 px-4 pt-14 pb-6"
          style={{ isolation: "isolate" }}
          onClick={(e) => { if (e.target === e.currentTarget) setExpandedSessionId(null); }}
        >
          <button
            type="button"
            aria-label="ปิดโหมดขยาย"
            onClick={() => setExpandedSessionId(null)}
            className="fixed right-4 top-4 z-[60] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
          >
            ปิด
          </button>

          {/* key forces a fresh H264Player mount every time a session is expanded */}
          <SessionPhoneControl
            key={`expanded-${expandedSession._id}`}
            session={expandedSession}
            variant="expanded"
            fetchedAt={lastSyncTimestamp}
          />
        </div>
      )}
    </div>
  );
}
