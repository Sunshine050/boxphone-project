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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { User, UserAction } from "@/types/user";
import { SessionsService } from "@/services/sessions.service";
import { UserMoveSessionDialog } from "./user-move-session-dialog";
import { UserDevicesDialog } from "./user-devices-dialog";

const statusMap: Record<User["status"], { label: string; className: string }> = {
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

function formatHMS(sec: number) {
  if (!sec || sec <= 0) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

export type DeviceMini = {
  id: string;
  name: string;
  serial_number: string;
  status?: "AVAILABLE" | "BUSY" | "OFFLINE";
};

export type UserDeviceAssigned = {
  device_id: string;
  assign_seconds?: number;
};

export function UserRow({
  user,
  index,
  currentUserId,
  onAction,
  userDevices,
  deviceMap,
}: {
  user: User;
  index: number;
  currentUserId: string | null;
  onAction: (action: UserAction) => void;
  userDevices: UserDeviceAssigned[];
  deviceMap: Record<string, DeviceMini>;
}) {
  const [showPass, setShowPass] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [devicesDialogOpen, setDevicesDialogOpen] = useState(false);

  /* ================= TIME LOGIC เดิมของนาย ================= */

  const initialTime = useMemo(() => {
    if (userDevices && userDevices.length > 0) {
      return userDevices[0].assign_seconds || 0;
    }
    return 0;
  }, [userDevices]);

  const [liveRemaining, setLiveRemaining] = useState<number>(initialTime);

  useEffect(() => {
    setLiveRemaining(initialTime);
  }, [initialTime]);

  const hasTime = initialTime > 0;
  const isStarted = user.status === "INUSE";

  useEffect(() => {
    if (!isStarted || liveRemaining <= 0) return;

    const timer = setInterval(() => {
      setLiveRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => onAction("refresh" as any), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, onAction]);

  const percent = useMemo(() => {
    const total = userDevices[0]?.assign_seconds || 1;
    return Math.max(0, Math.min(100, (liveRemaining / total) * 100));
  }, [liveRemaining, userDevices]);

  /* ================= DEVICE LABEL ================= */

  const firstDeviceLabel = useMemo(() => {
    if (!userDevices?.length) return "-";
    const firstId = userDevices[0].device_id;
    const meta = deviceMap[firstId];
    return meta ? meta.name : `รหัส: ..${firstId.slice(-4)}`;
  }, [userDevices, deviceMap]);

  const isSelf = currentUserId && user.id === currentUserId;

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
                <span>{showPass ? user.password_plain : "•".repeat(user.password_plain.length)}</span>
                <Button size="icon" variant="ghost" onClick={() => setShowPass((s) => !s)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground italic">ไม่มีข้อมูล</span>
            )}
          </div>
        </td>

        {/* STATUS */}
        <td className="text-center">
          <Badge className={statusMap[user.status].className}>
            {statusMap[user.status].label}
          </Badge>
        </td>

        {/* TIME — เดิม 100% */}
        <td className="text-center">
          {hasTime ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium">
                {formatPrettyTime(liveRemaining)}
              </span>
              <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${percent < 20 ? "bg-red-500" : "bg-green-500"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">ยังไม่มีเวลาใช้งาน</span>
          )}
        </td>

        {/* DEVICE + DROPDOWN */}
        <td className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span>{firstDeviceLabel}</span>

            {userDevices.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setDevicesDialogOpen(true)}
              >
                <ChevronDown size={16} />
              </Button>
            )}
          </div>
        </td>

        {/* ACTIONS */}
        <td className="p-4">
          <div className="flex justify-end gap-2">
            {isStarted && userDevices.length > 0 && (
              <Button
                size="icon"
                variant="outline"
                title="ย้ายเครื่อง"
                onClick={async () => {
                  const session: any = await SessionsService.getByUser(user.id);
                  if (!session?._id) return alert("ไม่พบ session");

                  setSessionId(session._id);
                  setMoveOpen(true);
                }}
              >
                <ArrowRightLeft size={16} />
              </Button>
            )}

            <Button size="icon" variant="outline" onClick={() => onAction("assign")}>
              <Settings2 size={16} />
            </Button>

            {user.role !== "ADMIN" && !isSelf && (
              <Button size="icon" variant="destructive" onClick={() => onAction("delete")}>
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </td>
      </motion.tr>

      <UserMoveSessionDialog
        open={moveOpen}
        sessionId={sessionId}
        onClose={() => setMoveOpen(false)}
        onSuccess={() => onAction("refresh" as any)}
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