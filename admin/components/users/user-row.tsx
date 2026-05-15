"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Eye,
  EyeOff,
  Settings2,
  MoreVertical,
  Pause,
  Play,
  Square,
  Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { SessionsService } from "@/services/sessions.service";
import { UserMoveSessionDialog } from "./user-move-session-dialog";
import { UserReduceTimeDialog } from "./user-reduce-time-dialog";
import { User, UserAction } from "@/types/user";
import { escapeHtml } from "@/lib/sanitize";
import { useToast } from "@/hooks/use-toast";

/* ================= STATUS UI ================= */

const statusMap: Record<string, any> = {
  PENDING: {
    label: "รอเชื่อมต่อ",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  },
  INUSE: {
    label: "กำลังใช้งาน",
    className: "bg-green-500/10 text-green-600 border-green-500/30",
  },
  INACTIVE: {
    label: "ไม่ใช้งาน",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  },
};

/* ================= TIME FORMAT ================= */

function formatHMS(sec: number) {
  if (!sec || sec <= 0) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:${String(s).padStart(2, "0")}`;
}

/* ===================================================== */

export function UserRow({
  user,
  index,
  currentUserId,
  onAction,
  userDevices = [],
  deviceMap = {},
  sessionsRefreshKey = 0,
}: {
  user: User;
  index: number;
  currentUserId: string | null;
  onAction: (action: UserAction) => void;
  userDevices?: {
    device_id: string;
    assign_seconds?: number;
  }[];
  deviceMap?: Record<string, any>;
  sessionsRefreshKey?: number;
}) {
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [reduceSession, setReduceSession] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loadingAction, setLoadingAction] = useState<Record<string, boolean>>({});

  /* ================= LOAD SESSIONS ================= */

  const loadSessions = async () => {
    try {
      const all = await SessionsService.getAll();

      const filtered = (all || []).filter(
        (s: any) =>
          s.user_id?._id === user.id &&
          ["ACTIVE", "PAUSED", "DISCONNECTED"].includes(s.status)
      );

      setSessions(filtered);
    } catch {
      setSessions([]);
    }
  };

  useEffect(() => {
    if (user?.id) loadSessions();
  }, [user?.id, user.status, sessionsRefreshKey]);

  /* ================= REALTIME CLOCK ================= */

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ================= PRIMARY SESSION ================= */

  const primarySession = sessions[0] || null;

  /** คำนวณเวลาที่เหลือของแต่ละ session (รองรับ ACTIVE = นับจาก resume/start) */
  const getRemainingForSession = (s: any) => {
    if (!s) return 0;
    const base = s.remaining_seconds ?? 0;
    if (s.status === "ACTIVE") {
      const ref = s.resume_time || s.start_time;
      if (!ref) return base;
      const elapsed = Math.floor(
        (now - new Date(ref).getTime()) / 1000
      );
      return Math.max(0, base - elapsed);
    }
    return base;
  };

  /** ชื่อเครื่องจาก session (populate หรือ deviceMap) */
  const getDeviceLabel = (s: any) => {
    if (!s) return "-";
    const id =
      s.device_id?._id ?? s.device_id ?? "";
    const name = s.device_id?.name ?? deviceMap[id]?.name;
    return name || (id ? `..${String(id).slice(-4)}` : "-");
  };

  const isSelf = currentUserId && user.id === currentUserId;

  /* ===================================================== */

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="border-b"
      >
        <td className="p-4 font-medium" title={escapeHtml(user.name)}>{user.name}</td>
        <td className="text-center font-mono text-sm" title={escapeHtml(user.username)}>{user.username}</td>

        {/* PASSWORD */}
        <td className="text-center">
          <div className="flex items-center justify-center gap-2 font-mono text-sm">
            {user.password_plain ? (
              <>
                <span>
                  {showPass
                    ? user.password_plain
                    : "•".repeat(user.password_plain.length)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowPass((s) => !s)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground italic">
                ไม่มีข้อมูล
              </span>
            )}
          </div>
        </td>

        {/* STATUS */}
        <td className="text-center">
          <Badge className={statusMap[user.status]?.className}>
            {statusMap[user.status]?.label}
          </Badge>
        </td>

        {/* เครื่อง + เวลา — แสดงแบบสะอาด (เครื่องเดียวหรือหลายเครื่อง) */}
        <td className="p-3 align-top text-center">
          <div className="inline-block text-left space-y-1.5">
            {sessions.length > 0 ? (
              sessions.map((s, idx) => {
                const remainingSec = getRemainingForSession(s);
                const total = s.total_seconds || 1;
                const percent = Math.max(
                  0,
                  Math.min(100, (remainingSec / total) * 100)
                );
                const isActive = s.status === "ACTIVE";
                return (
                  <div
                    key={s._id}
                    className={`flex items-center gap-3 py-1.5 ${
                      idx > 0 ? "border-t border-border/40" : ""
                    }`}
                  >
                    <span className="w-24 shrink-0 truncate text-left text-sm text-foreground" title={escapeHtml(getDeviceLabel(s))}>
                      {getDeviceLabel(s)}
                    </span>
                    <span className="w-16 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {formatHMS(remainingSec)}
                    </span>
                    <div className="h-1 w-14 shrink-0 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-[width] ${
                          percent < 20 ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {isActive && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                          disabled={!!loadingAction[`pause-${s._id}`]}
                          onClick={async () => {
                            setLoadingAction((p) => ({ ...p, [`pause-${s._id}`]: true }));
                            try {
                              await SessionsService.pause(s._id);
                              await loadSessions();
                              onAction("refresh");
                              toast({ title: "หยุด session แล้ว", description: `${getDeviceLabel(s)}` });
                            } catch (e: any) {
                              toast({ variant: "destructive", title: "หยุดไม่สำเร็จ", description: e?.message || "เกิดข้อผิดพลาด" });
                            } finally {
                              setLoadingAction((p) => ({ ...p, [`pause-${s._id}`]: false }));
                            }
                          }}
                          title="Pause"
                        >
                          <Pause size={12} />
                        </Button>
                      )}
                      {!isActive && (s.status === "PAUSED" || s.status === "DISCONNECTED") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
                          disabled={!!loadingAction[`resume-${s._id}`]}
                          onClick={async () => {
                            setLoadingAction((p) => ({ ...p, [`resume-${s._id}`]: true }));
                            try {
                              await SessionsService.resume(s._id);
                              await loadSessions();
                              onAction("refresh");
                              toast({ title: "เล่นต่อแล้ว", description: `${getDeviceLabel(s)}` });
                            } catch (e: any) {
                              toast({ variant: "destructive", title: "เล่นต่อไม่สำเร็จ", description: e?.message || "เกิดข้อผิดพลาด" });
                            } finally {
                              setLoadingAction((p) => ({ ...p, [`resume-${s._id}`]: false }));
                            }
                          }}
                          title="Resume"
                        >
                          <Play size={12} />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-orange-500"
                        onClick={() => setReduceSession(s)}
                        title="ลดเวลา"
                      >
                        <Minus size={12} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={!!loadingAction[`cancel-${s._id}`]}
                        onClick={async () => {
                          if (!confirm(`ยกเลิก session เครื่อง ${getDeviceLabel(s)}?`)) return;
                          setLoadingAction((p) => ({ ...p, [`cancel-${s._id}`]: true }));
                          try {
                            await SessionsService.cancel(s._id);
                            await loadSessions();
                            onAction("refresh");
                            toast({ title: "ยกเลิก session แล้ว", description: `${getDeviceLabel(s)}` });
                          } catch (e: any) {
                            toast({ variant: "destructive", title: "ยกเลิกไม่สำเร็จ", description: e?.message || "เกิดข้อผิดพลาด" });
                          } finally {
                            setLoadingAction((p) => ({ ...p, [`cancel-${s._id}`]: false }));
                          }
                        }}
                        title="Cancel"
                      >
                        <Square size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : userDevices?.length > 0 ? (
              userDevices.map((d, i) => {
                const meta = deviceMap[d.device_id];
                const sec = d.assign_seconds ?? 0;
                return (
                  <div
                    key={d.device_id || i}
                    className={`flex items-center gap-3 py-1.5 ${
                      i > 0 ? "border-t border-border/40" : ""
                    }`}
                  >
                    <span className="w-24 shrink-0 truncate text-left text-sm text-foreground">
                      {meta?.name || `..${String(d.device_id).slice(-4)}`}
                    </span>
                    <span className="w-16 font-mono text-xs text-muted-foreground">
                      {formatHMS(sec)}
                    </span>
                    <span className="text-[11px] text-muted-foreground italic">
                      ยังไม่เริ่ม
                    </span>
                  </div>
                );
              })
            ) : (
              <span className="text-muted-foreground text-sm">
                —
              </span>
            )}
          </div>
        </td>

        {/* ACTION MENU */}
        <td className="p-4 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onAction("assign")}>
                <Settings2 size={14} className="mr-2" />
                Assign device/time
              </DropdownMenuItem>

              {user.role !== "ADMIN" && !isSelf && (
                <DropdownMenuItem
                  className="text-red-500"
                  onClick={() => onAction("delete")}
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete user
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </motion.tr>

      <UserMoveSessionDialog
        open={moveOpen}
        sessionId={primarySession?._id}
        onClose={() => setMoveOpen(false)}
        onSuccess={() => {
          loadSessions();
          onAction("refresh");
        }}
      />

      <UserReduceTimeDialog
        open={!!reduceSession}
        sessionId={reduceSession?._id}
        deviceLabel={getDeviceLabel(reduceSession)}
        onClose={() => setReduceSession(null)}
        onSuccess={() => {
          loadSessions();
          onAction("refresh");
          setReduceSession(null);
        }}
      />

    </>
  );
}