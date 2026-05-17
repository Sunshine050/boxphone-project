"use client";

import { User, UserAction } from "@/types/user";
import { UserRow } from "./user-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pause,
  Play,
  Square,
  Minus,
  Settings2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { SessionsService } from "@/services/sessions.service";
import { useMemo, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { UserReduceTimeDialog } from "./user-reduce-time-dialog";

export type DeviceMini = {
  id: string;
  name: string;
  serial_number: string;
  status?: "AVAILABLE" | "BUSY" | "OFFLINE" | "UNDER_REPAIR" | "DAMAGED" | "QUARANTINE";
};

export type UserDeviceAssigned = {
  device_id: string;
  assign_seconds?: number;
};

/* ================= STATUS CONFIG ================= */
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "รอเชื่อมต่อ", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  INUSE: { label: "กำลังใช้งาน", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  INACTIVE: { label: "ไม่ใช้งาน", className: "bg-gray-500/10 text-gray-500 border-gray-500/30" },
};

import { formatDurationThai } from "@boxphon/shared/client/format-duration";
import { getServerNow } from "@boxphon/shared/client/server-time";
const formatHMS = formatDurationThai;

/* ================= MOBILE CARD ================= */
function UserMobileCard({
  user,
  userSessions,
  now,
  deviceMap,
  currentUserId,
  onAction,
  onSessionsRefresh,
}: {
  user: User;
  userSessions: any[];
  now: number;
  deviceMap: Record<string, DeviceMini>;
  currentUserId: string | null;
  onAction: (action: UserAction) => void;
  onSessionsRefresh: () => void;
}) {
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState<Record<string, boolean>>({});
  const [reduceSession, setReduceSession] = useState<any | null>(null);

  const isSelf = currentUserId && user.id === currentUserId;

  const getRemainingForSession = (s: any) => {
    const base = s.remaining_seconds ?? 0;
    if (s.status === "ACTIVE") {
      const ref = s.resume_time || s.start_time;
      if (!ref) return base;
      const elapsed = Math.floor((now - new Date(ref).getTime()) / 1000);
      return Math.max(0, base - elapsed);
    }
    return base;
  };

  const getDeviceLabel = (s: any) => {
    const id = s.device_id?._id ?? s.device_id ?? "";
    const name = s.device_id?.name ?? deviceMap[id]?.name;
    return name || (id ? `..${String(id).slice(-4)}` : "-");
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-4 space-y-3">
          {/* Row 1: Name + Status + Actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground font-mono">@{user.username}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={STATUS_MAP[user.status]?.className || ""}>
                {STATUS_MAP[user.status]?.label || user.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onAction("assign")}>
                    <Settings2 size={14} className="mr-2" />
                    Assign device/time
                  </DropdownMenuItem>
                  {user.role !== "ADMIN" && !isSelf && (
                    <DropdownMenuItem className="text-red-500" onClick={() => onAction("delete")}>
                      <Trash2 size={14} className="mr-2" />
                      Delete user
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Row 2: Sessions */}
          {userSessions.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              {userSessions.map((s) => {
                const remaining = getRemainingForSession(s);
                const total = s.total_seconds || 1;
                const percent = Math.max(0, Math.min(100, (remaining / total) * 100));
                const isActive = s.status === "ACTIVE";
                const isPaused = s.status === "PAUSED" || s.status === "DISCONNECTED";

                return (
                  <div key={s._id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm truncate font-medium">{getDeviceLabel(s)}</span>
                        <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                          {formatHMS(remaining)}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-[width] ${percent < 20 ? "bg-red-500" : "bg-emerald-500"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Session action buttons */}
                    <div className="flex gap-0.5 shrink-0">
                      {isActive && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                          disabled={!!loadingAction[`pause-${s._id}`]}
                          title="Pause"
                          onClick={async () => {
                            setLoadingAction((p) => ({ ...p, [`pause-${s._id}`]: true }));
                            try {
                              await SessionsService.pause(s._id);
                              onSessionsRefresh();
                              onAction("refresh");
                              toast({ title: "หยุด session แล้ว", description: getDeviceLabel(s) });
                            } catch (e: any) {
                              toast({ variant: "destructive", title: "หยุดไม่สำเร็จ", description: e?.message });
                            } finally {
                              setLoadingAction((p) => ({ ...p, [`pause-${s._id}`]: false }));
                            }
                          }}
                        >
                          <Pause size={11} />
                        </Button>
                      )}
                      {isPaused && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
                          disabled={!!loadingAction[`resume-${s._id}`]}
                          title="Resume"
                          onClick={async () => {
                            setLoadingAction((p) => ({ ...p, [`resume-${s._id}`]: true }));
                            try {
                              await SessionsService.resume(s._id);
                              onSessionsRefresh();
                              onAction("refresh");
                              toast({ title: "เล่นต่อแล้ว", description: getDeviceLabel(s) });
                            } catch (e: any) {
                              toast({ variant: "destructive", title: "เล่นต่อไม่สำเร็จ", description: e?.message });
                            } finally {
                              setLoadingAction((p) => ({ ...p, [`resume-${s._id}`]: false }));
                            }
                          }}
                        >
                          <Play size={11} />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-orange-500"
                        title="ลดเวลา"
                        onClick={() => setReduceSession(s)}
                      >
                        <Minus size={11} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={!!loadingAction[`cancel-${s._id}`]}
                        title="Cancel"
                        onClick={async () => {
                          if (!confirm(`ยกเลิก session เครื่อง ${getDeviceLabel(s)}?`)) return;
                          setLoadingAction((p) => ({ ...p, [`cancel-${s._id}`]: true }));
                          try {
                            await SessionsService.cancel(s._id);
                            onSessionsRefresh();
                            onAction("refresh");
                            toast({ title: "ยกเลิก session แล้ว", description: getDeviceLabel(s) });
                          } catch (e: any) {
                            toast({ variant: "destructive", title: "ยกเลิกไม่สำเร็จ", description: e?.message });
                          } finally {
                            setLoadingAction((p) => ({ ...p, [`cancel-${s._id}`]: false }));
                          }
                        }}
                      >
                        <Square size={11} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <UserReduceTimeDialog
        open={!!reduceSession}
        sessionId={reduceSession?._id}
        deviceLabel={
          reduceSession
            ? reduceSession.device_id?.name ?? deviceMap[reduceSession.device_id?._id ?? reduceSession.device_id]?.name ?? "-"
            : undefined
        }
        onClose={() => setReduceSession(null)}
        onSuccess={() => {
          onSessionsRefresh();
          onAction("refresh");
          setReduceSession(null);
        }}
      />
    </>
  );
}

/* ================= MAIN TABLE ================= */
export function UsersTable({
  users,
  currentUserId,
  onAction,
  deviceMap,
  externalRefreshKey = 0,
}: {
  users: User[];
  currentUserId: string | null;
  onAction: (action: UserAction, user: User) => void;
  deviceMap: Record<string, DeviceMini>;
  externalRefreshKey?: number;
}) {
  const { toast } = useToast();

  const getUserDevices = (u: any): UserDeviceAssigned[] => {
    if (u.devices && Array.isArray(u.devices) && u.devices.length > 0) {
      return u.devices.map((item: any) => {
        const idFromBackend = item.device_id || item._id;
        return {
          device_id: idFromBackend ? String(idFromBackend).trim() : "no-id",
          assign_seconds: item.remaining_seconds ?? item.total_seconds ?? 0,
        };
      });
    }
    if (u.device_id) {
      return [{ device_id: String(u.device_id).trim(), assign_seconds: u.remaining_seconds ?? 0 }];
    }
    return [];
  };

  const rows = useMemo(() => users.map((u) => ({ user: u, devices: getUserDevices(u) })), [users]);

  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);
  const [loadingPauseAll, setLoadingPauseAll] = useState(false);
  const [loadingResumeAll, setLoadingResumeAll] = useState(false);
  const [now, setNow] = useState(() => getServerNow());

  useEffect(() => {
    if (externalRefreshKey > 0) setSessionsRefreshKey((k) => k + 1);
  }, [externalRefreshKey]);

  useEffect(() => {
    const t = setInterval(() => setNow(getServerNow()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadAllSessions = () => {
    let cancelled = false;
    SessionsService.getAll()
      .then((list) => {
        if (!cancelled) {
          setAllSessions((list || []).filter((s: any) =>
            ["ACTIVE", "PAUSED", "DISCONNECTED"].includes(s.status)
          ));
        }
      })
      .catch(() => { if (!cancelled) setAllSessions([]); });
    return () => { cancelled = true; };
  };

  useEffect(() => {
    return loadAllSessions();
  }, [users, sessionsRefreshKey]);

  const activeSessions = useMemo(() => allSessions.filter((s: any) => s.status === "ACTIVE"), [allSessions]);
  const pausedSessions = useMemo(() => allSessions.filter((s: any) => ["PAUSED", "DISCONNECTED"].includes(s.status)), [allSessions]);

  const handlePauseAll = async () => {
    if (activeSessions.length === 0) return;
    setLoadingPauseAll(true);
    try {
      for (const s of activeSessions) await SessionsService.pause(s._id);
      setSessionsRefreshKey((k) => k + 1);
      if (users.length > 0) onAction("refresh", users[0]);
      toast({ title: "หยุดทุก session แล้ว", description: `หยุด ${activeSessions.length} session` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "หยุดไม่สำเร็จ", description: e?.message || "เกิดข้อผิดพลาด" });
    } finally {
      setLoadingPauseAll(false);
    }
  };

  const handleResumeAll = async () => {
    if (pausedSessions.length === 0) return;
    setLoadingResumeAll(true);
    try {
      for (const s of pausedSessions) await SessionsService.resume(s._id);
      setSessionsRefreshKey((k) => k + 1);
      if (users.length > 0) onAction("refresh", users[0]);
      toast({ title: "เล่นต่อทุก session แล้ว", description: `เริ่มต่อ ${pausedSessions.length} session` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "เล่นต่อไม่สำเร็จ", description: e?.message || "เกิดข้อผิดพลาด" });
    } finally {
      setLoadingResumeAll(false);
    }
  };

  return (
    <Card>
      {/* ===== HEADER ===== */}
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base sm:text-lg">จัดการผู้ใช้</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 flex-1 sm:flex-none"
            disabled={activeSessions.length === 0 || loadingPauseAll}
            onClick={handlePauseAll}
          >
            <Pause size={14} />
            <span className="hidden xs:inline">{loadingPauseAll ? "กำลังหยุด..." : "หยุดทั้งหมด"}</span>
            <span className="xs:hidden">{loadingPauseAll ? "..." : "หยุดทั้งหมด"}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 flex-1 sm:flex-none"
            disabled={pausedSessions.length === 0 || loadingResumeAll}
            onClick={handleResumeAll}
          >
            <Play size={14} />
            <span className="hidden xs:inline">{loadingResumeAll ? "กำลังเริ่ม..." : "เล่นต่อทั้งหมด"}</span>
            <span className="xs:hidden">{loadingResumeAll ? "..." : "เล่นต่อทั้งหมด"}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 lg:p-0">
        {/* ===== MOBILE CARD VIEW (< lg) ===== */}
        <div className="lg:hidden space-y-3">
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีผู้ใช้</p>
          )}
          {rows.map(({ user: u }) => {
            const userSessions = allSessions.filter(
              (s: any) => s.user_id?._id === u.id || s.user_id === u.id
            );
            return (
              <UserMobileCard
                key={u.id}
                user={u}
                userSessions={userSessions}
                now={now}
                deviceMap={deviceMap}
                currentUserId={currentUserId}
                onAction={(action) => onAction(action, u)}
                onSessionsRefresh={() => setSessionsRefreshKey((k) => k + 1)}
              />
            );
          })}
        </div>

        {/* ===== DESKTOP TABLE VIEW (lg+) ===== */}
        <div className="hidden lg:block w-full overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="p-4 text-left w-[14%]">ชื่อผู้ใช้</th>
                <th className="text-center w-[12%]">Username</th>
                <th className="text-center w-[16%]">Password</th>
                <th className="text-center w-[10%]">สถานะ</th>
                <th className="p-4 text-center w-[30%]">เครื่อง / เวลา / จัดการ</th>
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
