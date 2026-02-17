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
  userDevices: UserDeviceAssigned[];
  deviceMap: Record<string, DeviceMini>;
}) {
  const [showPass, setShowPass] = useState(false);

  // 🎯 ดึงเวลาเริ่มต้นจาก Database (Props)
  const initialTime = useMemo(() => {
    if (userDevices && userDevices.length > 0) {
      return userDevices[0].assign_seconds || 0;
    }
    return 0;
  }, [userDevices]);

  const [liveRemaining, setLiveRemaining] = useState<number>(initialTime);

  // 🎯 จุดที่ 1: แก้ไขให้ Sync ตาม Backend ทันทีที่ข้อมูลเปลี่ยน
  useEffect(() => {
    setLiveRemaining(initialTime);
  }, [initialTime]);

  const hasTime = initialTime > 0;
  const isStarted = user.status === "INUSE";

  // 🎯 จุดที่ 2: ปรับ Timer ให้เดินต่อเนื่อง ไม่สะดุด
  useEffect(() => {
    // เดินเวลาเฉพาะตอนกำลังใช้งานและยังมีเวลาเหลือ
    if (!isStarted || liveRemaining <= 0) return;

    const timer = setInterval(() => {
      setLiveRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // เมื่อเวลาหมดจริงๆ ให้สั่ง Refresh ข้อมูลใหม่จาก API
          setTimeout(() => onAction("refresh" as any), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // 💡 ไม่ใส่ liveRemaining ใน deps เพื่อไม่ให้ setInterval ถูก reset ทุกวินาที
  }, [isStarted, onAction]);

  const percent = useMemo(() => {
    const total = userDevices[0]?.assign_seconds || 1;
    return Math.max(0, Math.min(100, (liveRemaining / total) * 100));
  }, [liveRemaining, userDevices]);

  const isSelf = currentUserId && user.id === currentUserId;

  const firstDeviceLabel = useMemo(() => {
    if (!userDevices || userDevices.length === 0) return "-";
    const firstId = userDevices[0].device_id;
    if (!firstId || firstId === "no-id" || firstId === "undefined") return "ไม่พบรหัสอุปกรณ์";
    const meta = deviceMap[firstId];
    if (meta) return meta.name;
    return `รหัส: ..${firstId.slice(-4)}`;
  }, [userDevices, deviceMap]);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border-b"
    >
      <td className="p-4 font-medium">{user.name}</td>
      <td className="text-center font-mono text-sm">{user.username}</td>
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
      <td className="text-center">
        <Badge className={statusMap[user.status].className}>{statusMap[user.status].label}</Badge>
      </td>
      <td className="text-center">
        {hasTime ? (
          <div className="flex flex-col items-center gap-1">
            <span className={`text-xs font-medium ${isStarted ? "text-foreground" : "text-muted-foreground"}`}>
              {formatPrettyTime(liveRemaining)}
              {!isStarted && <span className="ml-2 italic text-[11px]">(ยังไม่เริ่ม)</span>}
            </span>
            <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 linear ${percent < 20 ? "bg-red-500" : "bg-green-500"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <span className="text-xs italic">ยังไม่มีเวลาใช้งาน</span>
            <div className="h-1.5 w-28 bg-muted rounded-full" />
          </div>
        )}
      </td>
      <td className="text-center text-sm">
        {userDevices.length === 0 ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition">
                <span className="truncate max-w-[120px]">{firstDeviceLabel}</span>
                <ChevronDown size={16} className="opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px] max-h-[260px] overflow-y-auto">
              <div className="px-2 py-2 text-xs text-muted-foreground">อุปกรณ์ทั้งหมด ({userDevices.length})</div>
              <div className="space-y-2 p-2">
                {userDevices.map((item) => {
                  const meta = deviceMap[item.device_id];
                  return (
                    <div key={item.device_id} className="rounded-xl border bg-background/40 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{meta?.name || item.device_id}</div>
                          <div className="text-xs text-muted-foreground truncate">SN: {meta?.serial_number || "-"}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            เวลา: <span className="text-foreground font-medium">{secondsToHoursText(item.assign_seconds)}</span>
                          </div>
                        </div>
                        <Badge className="text-xs">{meta?.status || "UNKNOWN"}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
      <td className="p-4">
        <div className="flex justify-end gap-2">
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
  );
}