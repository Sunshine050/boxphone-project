"use client";

import { User, UserAction } from "@/types/user";
import { UserRow } from "./user-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { SessionsService } from "@/services/sessions.service";
import { useMemo, useState, useEffect } from "react";

export type DeviceMini = {
  id: string;
  name: string;
  serial_number: string;
  status?: "AVAILABLE" | "BUSY" | "OFFLINE";
};

export type UserDeviceAssigned = {
  device_id: string;
  assign_seconds?: number; // optional (ถ้ามีใน backend)
};

export function UsersTable({
  users,
  currentUserId,
  onAction,
  deviceMap,
}: {
  users: User[];
  currentUserId: string | null;
  onAction: (action: UserAction, user: User) => void;
  deviceMap: Record<string, DeviceMini>;
}) {
  // ในส่วนของ UsersTable component
const getUserDevices = (u: any): UserDeviceAssigned[] => {
  // 1. ตรวจสอบว่ามี Array devices และมีข้อมูลข้างในไหม
  if (u.devices && Array.isArray(u.devices) && u.devices.length > 0) {
    return u.devices.map((item: any) => {
      // 🎯 ต้องดึงจาก item.device_id เท่านั้น
      const idFromBackend = item.device_id || item._id; 
      
      return {
        // แปลงเป็น String และล้างค่าว่างเพื่อเอาไป match กับ deviceMap
        device_id: idFromBackend ? String(idFromBackend).trim() : "no-id",
        assign_seconds: item.remaining_seconds ?? item.total_seconds ?? 0,
      };
    });
  }

  // 2. กรณีสำรองเผื่อบาง User เก็บที่ root (ถ้ามี)
  if (u.device_id) {
    return [{
      device_id: String(u.device_id).trim(),
      assign_seconds: u.remaining_seconds ?? 0
    }];
  }

  return [];
};

  const rows = useMemo(() => {
    return users.map((u) => ({
      user: u,
      devices: getUserDevices(u),
    }));
  }, [users]);

  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);
  const [loadingPauseAll, setLoadingPauseAll] = useState(false);
  const [loadingResumeAll, setLoadingResumeAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    SessionsService.getAll()
      .then((list) => {
        if (!cancelled) {
          const live = (list || []).filter((s: any) =>
            ["ACTIVE", "PAUSED", "DISCONNECTED"].includes(s.status)
          );
          setAllSessions(live);
        }
      })
      .catch(() => {
        if (!cancelled) setAllSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [users, sessionsRefreshKey]);

  const activeSessions = useMemo(
    () => allSessions.filter((s: any) => s.status === "ACTIVE"),
    [allSessions]
  );
  const pausedSessions = useMemo(
    () =>
      allSessions.filter((s: any) =>
        ["PAUSED", "DISCONNECTED"].includes(s.status)
      ),
    [allSessions]
  );

  const handlePauseAll = async () => {
    if (activeSessions.length === 0) return;
    setLoadingPauseAll(true);
    try {
      for (const s of activeSessions) {
        await SessionsService.pause(s._id);
      }
      setSessionsRefreshKey((k) => k + 1);
      if (users.length > 0) onAction("refresh", users[0]);
    } finally {
      setLoadingPauseAll(false);
    }
  };

  const handleResumeAll = async () => {
    if (pausedSessions.length === 0) return;
    setLoadingResumeAll(true);
    try {
      for (const s of pausedSessions) {
        await SessionsService.resume(s._id);
      }
      setSessionsRefreshKey((k) => k + 1);
      if (users.length > 0) onAction("refresh", users[0]);
    } finally {
      setLoadingResumeAll(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>จัดการผู้ใช้</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={activeSessions.length === 0 || loadingPauseAll}
            onClick={handlePauseAll}
          >
            <Pause size={14} />
            {loadingPauseAll ? "กำลังหยุด..." : "หยุดทั้งหมด"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={pausedSessions.length === 0 || loadingResumeAll}
            onClick={handleResumeAll}
          >
            <Play size={14} />
            {loadingResumeAll ? "กำลังเริ่ม..." : "เล่นต่อทั้งหมด"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* ✅ responsive: ถ้าจอเล็กให้ scroll แนวนอน */}
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed min-w-[980px]">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="p-4 text-left w-[14%]">ชื่อผู้ใช้</th>
                <th className="text-center w-[12%]">Username</th>
                <th className="text-center w-[18%]">Password</th>
                <th className="text-center w-[10%]">สถานะ</th>
                <th className="p-4 text-center w-[28%]">เครื่อง / เวลา / จัดการ</th>
                <th className="p-4 text-right w-[18%]">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(({ user: u, devices }, i) => (
                <UserRow
                  key={u.id}
                  user={u}
                  index={i}
                  currentUserId={currentUserId}
                  userDevices={devices}
                  deviceMap={deviceMap}
                  sessionsRefreshKey={sessionsRefreshKey}
                  onAction={(action) => onAction(action, u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
