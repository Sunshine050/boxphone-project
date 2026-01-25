"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, EyeOff, Settings2, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { User, UserAction } from "@/types/user";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

function secondsToHoursText(seconds?: number) {
  if (!seconds || seconds <= 0) return "0.00 ชม.";
  return `${(seconds / 3600).toFixed(2)} ชม.`;
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

  // ✅ multi devices
  userDevices: UserDeviceAssigned[];

  // ✅ device map from parent
  deviceMap: Record<string, DeviceMini>;
}) {
  const [showPass, setShowPass] = useState(false);

  const [liveRemaining, setLiveRemaining] = useState<number>(
    user.remaining_seconds ?? 0
  );

  useEffect(() => {
    setLiveRemaining(user.remaining_seconds ?? 0);
  }, [user.remaining_seconds, user.id]);

  const hasTime = (user.total_seconds ?? 0) > 0;
  const isStarted = user.status === "INUSE";

  useEffect(() => {
    if (!isStarted) return;
    if (!hasTime) return;
    if (liveRemaining <= 0) return;

    const timer = setInterval(() => {
      setLiveRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, hasTime, liveRemaining]);

  const percent = useMemo(() => {
    if (!hasTime) return 0;
    if (!user.total_seconds || user.total_seconds <= 0) return 0;
    const raw = (liveRemaining / user.total_seconds) * 100;
    return Math.max(0, Math.min(100, raw));
  }, [hasTime, liveRemaining, user.total_seconds]);

  const isSelf = currentUserId && user.id === currentUserId;

  const firstDeviceLabel = useMemo(() => {
    if (!userDevices || userDevices.length === 0) return "-";

    const firstId = userDevices[0].device_id;
    const meta = deviceMap[firstId];
    const name = meta?.name || firstId;

    if (userDevices.length === 1) return name;
    return `${name} (+${userDevices.length - 1})`;
  }, [userDevices, deviceMap]);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border-b"
    >
      {/* name */}
      <td className="p-4 font-medium">{user.name}</td>

      {/* username */}
      <td className="text-center font-mono text-sm">{user.username}</td>

      {/* password */}
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
                title={showPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </>
          ) : (
            <span className="text-muted-foreground italic">ไม่มีข้อมูล</span>
          )}
        </div>
      </td>

      {/* role */}
      <td className="text-center font-mono text-sm">{user.role}</td>

      {/* status */}
      <td className="text-center">
        <Badge className={statusMap[user.status].className}>
          {statusMap[user.status].label}
        </Badge>
      </td>

      {/* time */}
      <td className="text-center">
        {hasTime ? (
          <div className="flex flex-col items-center gap-1">
            <span
              className={`text-xs font-medium ${
                isStarted ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {formatPrettyTime(liveRemaining)}
              {!isStarted && (
                <span className="ml-2 italic text-[11px]">(ยังไม่เริ่ม)</span>
              )}
            </span>

            <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  percent < 20 ? "bg-red-500" : "bg-green-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <span className="text-xs italic">ยังไม่เริ่มใช้งาน</span>
            <div className="h-1.5 w-28 bg-muted rounded-full" />
          </div>
        )}
      </td>

      {/* ✅ device dropdown */}
      <td className="text-center text-sm">
        {userDevices.length === 0 ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="
                  inline-flex items-center justify-center gap-1
                  px-2 py-1 rounded-lg
                  text-muted-foreground hover:text-foreground
                  hover:bg-muted/30 transition
                "
              >
                <span className="truncate max-w-[120px]">{firstDeviceLabel}</span>
                <ChevronDown size={16} className="opacity-70" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-[320px] max-h-[260px] overflow-y-auto"
            >
              <div className="px-2 py-2 text-xs text-muted-foreground">
                อุปกรณ์ทั้งหมด ({userDevices.length})
              </div>

              <div className="space-y-2 p-2">
                {userDevices.map((item) => {
                  const meta = deviceMap[item.device_id];

                  return (
                    <div
                      key={item.device_id}
                      className="rounded-xl border bg-background/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {meta?.name || item.device_id}
                          </div>

                          <div className="text-xs text-muted-foreground truncate">
                            SN: {meta?.serial_number || "-"}
                          </div>

                          <div className="text-xs text-muted-foreground mt-1">
                            เวลา:{" "}
                            <span className="text-foreground font-medium">
                              {secondsToHoursText(item.assign_seconds)}
                            </span>
                          </div>
                        </div>

                        <Badge className="text-xs">
                          {meta?.status || "UNKNOWN"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>

      {/* actions */}
      <td className="p-4">
        <div className="flex justify-end gap-2">
          {/* ✅ ปุ่มเดียว */}
          <Button
            size="icon"
            variant="outline"
            onClick={() => onAction("assign")}
            title="จัดการ Device + เวลา"
          >
            <Settings2 size={16} />
          </Button>

          {/* delete */}
          {user.role !== "ADMIN" && !isSelf && (
            <Button
              size="icon"
              variant="destructive"
              onClick={() => onAction("delete")}
              title="delete"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </td>
    </motion.tr>
  );
}
