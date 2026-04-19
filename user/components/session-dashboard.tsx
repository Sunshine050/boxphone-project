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
  lastSyncTimestamp: _lastSyncTimestamp,
  refreshData: _refreshData,
}: DashboardProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const handleLogout = async () => {
    await AuthService.logout();
    window.location.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="container mx-auto p-4 sm:p-6">
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
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-10 sm:gap-x-8 sm:gap-y-10 xl:gap-x-10">
            {sessions.map((s) => (
              <SessionPhoneControl key={s._id} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
