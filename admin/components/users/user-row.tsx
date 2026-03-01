"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Eye,
  EyeOff,
  Settings2,
  ChevronDown,
  ArrowRightLeft,
  MoreVertical,
  Pause,
  Play,
  Square,
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
import { UserDevicesDialog } from "./user-devices-dialog";
import { User, UserAction } from "@/types/user";

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

function formatPrettyTime(sec: number) {
  if (!sec || sec <= 0) return "หมดเวลา";
  const day = Math.floor(sec / 86400);
  const hour = Math.floor((sec % 86400) / 3600);
  const minute = Math.floor((sec % 3600) / 60);

  if (day >= 1) {
    if (hour > 0) return `${day} วัน ${hour} ชม.`;
    if (minute > 0) return `${day} วัน ${minute} นาที`;
    return `${day} วัน`;
  }
  return formatHMS(sec);
}

/* ===================================================== */

export function UserRow({
  user,
  index,
  currentUserId,
  onAction,
  userDevices = [],
  deviceMap = {},
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
}) {
  const [showPass, setShowPass] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [devicesDialogOpen, setDevicesDialogOpen] = useState(false);
  const [session, setSession] = useState<any | null>(null);

  /* ================= LOAD SESSION ================= */

  const loadSession = async () => {
    try {
      const s = await SessionsService.getByUser(user.id);
      setSession(s || null);
    } catch {
      setSession(null);
    }
  };

  useEffect(() => {
    if (user?.id) loadSession();
  }, [user?.id, user.status]); // 🔴 สำคัญ: login แล้วโหลดใหม่ทันที

  /* ================= REALTIME CLOCK ================= */

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ================= BASE REMAINING ================= */

  const baseRemaining = session?.remaining_seconds
    ?? userDevices?.[0]?.assign_seconds
    ?? 0;

  /* ================= CALCULATE REAL TIME ================= */

  const remaining = useMemo(() => {
    if (!session) return baseRemaining;

    let base = session.remaining_seconds ?? 0;

    if (session.status === "ACTIVE") {
      const ref = session.resume_time || session.start_time;
      if (!ref) return base;

      const elapsed = Math.floor(
        (now - new Date(ref).getTime()) / 1000
      );

      return Math.max(0, base - elapsed);
    }

    return base;
  }, [session, baseRemaining, now]);

  /* ================= PROGRESS ================= */

  const percent = useMemo(() => {
    const total =
      session?.total_seconds ||
      userDevices?.[0]?.assign_seconds ||
      1;
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  }, [remaining, session, userDevices]);

  /* ================= DEVICE LABEL ================= */

  const firstDeviceLabel = useMemo(() => {
    if (!userDevices?.length) return "-";
    const id = userDevices[0].device_id;
    const meta = deviceMap[id];
    return meta?.name || `..${String(id).slice(-4)}`;
  }, [userDevices, deviceMap]);

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
        <td className="p-4 font-medium">{user.name}</td>
        <td className="text-center font-mono text-sm">{user.username}</td>

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

        {/* TIME */}
        <td className="text-center">
          {remaining > 0 ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium">
                {formatPrettyTime(remaining)}
              </span>
              <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    percent < 20 ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">
              ยังไม่มีเวลาใช้งาน
            </span>
          )}
        </td>

        {/* DEVICE */}
        <td className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span>{firstDeviceLabel}</span>

            {userDevices.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDevicesDialogOpen(true)}
              >
                <ChevronDown size={16} />
              </Button>
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

              {session && (
                <>
                  {session.status === "ACTIVE" && (
                    <DropdownMenuItem
                      onClick={async () => {
                        await SessionsService.pause(session._id);
                        await loadSession();
                        onAction("refresh");
                      }}
                    >
                      <Pause size={14} className="mr-2" />
                      Pause
                    </DropdownMenuItem>
                  )}

                  {(session.status === "PAUSED" ||
                    session.status === "DISCONNECTED") && (
                    <DropdownMenuItem
                      onClick={async () => {
                        await SessionsService.resume(session._id);
                        await loadSession();
                        onAction("refresh");
                      }}
                    >
                      <Play size={14} className="mr-2" />
                      Resume
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                    <ArrowRightLeft size={14} className="mr-2" />
                    Move
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="text-red-500"
                    onClick={async () => {
                      if (!confirm("Cancel session?")) return;
                      await SessionsService.cancel(session._id);
                      await loadSession();
                      onAction("refresh");
                    }}
                  >
                    <Square size={14} className="mr-2" />
                    Cancel
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                </>
              )}

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
        sessionId={session?._id}
        onClose={() => setMoveOpen(false)}
        onSuccess={() => {
          loadSession();
          onAction("refresh");
        }}
      />

      <UserDevicesDialog
        open={devicesDialogOpen}
        onClose={() => setDevicesDialogOpen(false)}
        devices={userDevices}
        deviceMap={deviceMap}
      />
    </>
  );
}