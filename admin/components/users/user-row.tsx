"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, PlusCircle, Unplug, Clock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { User, UserAction } from "@/types/user";

const statusMap: Record<User["status"], { label: string; className: string }> =
  {
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

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

/**
 * ✅ format แบบอ่านง่ายสำหรับเวลาใหญ่ (วัน/เดือน/ปี)
 * - >= 1 วัน: "10 วัน 5 ชม."
 * - < 1 วัน: "HH:MM:SS"
 */
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

export function UserRow({
  user,
  index,
  currentUserId,
  onAction,
}: {
  user: User;
  index: number;
  currentUserId: string | null;
  onAction: (action: UserAction) => void;
}) {
  const [showPass, setShowPass] = useState(false);

  // ✅ state เวลาที่จะ “ลดจริงบนหน้า”
  const [liveRemaining, setLiveRemaining] = useState<number>(
    user.remaining_seconds ?? 0
  );

  // ✅ sync เวลาใหม่เมื่อ backend ส่ง user list มาใหม่
  useEffect(() => {
    setLiveRemaining(user.remaining_seconds ?? 0);
  }, [user.remaining_seconds, user.id]);

  // ✅ มีเวลาไหม
  const hasTime = (user.total_seconds ?? 0) > 0;

  // ✅ ✅ สำคัญ: จะเริ่มนับเวลา "เมื่อใช้งานจริงเท่านั้น"
  // logic: start ตอน INUSE เท่านั้น
  const isStarted = user.status === "INUSE";

  // ✅ countdown ลดลงเองทุก 1 วินาที (เฉพาะตอนเริ่มแล้ว)
  useEffect(() => {
    // ❌ ยังไม่เริ่มใช้งานจริง → ห้ามนับ
    if (!isStarted) return;

    // ❌ ไม่มีเวลา หรือหมดแล้ว → ไม่ต้องนับ
    if (!hasTime) return;
    if (liveRemaining <= 0) return;

    const timer = setInterval(() => {
      setLiveRemaining((prev) => {
        const next = prev - 1;
        return next < 0 ? 0 : next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, hasTime, liveRemaining]);

  // ✅ progress bar %
  const percent = useMemo(() => {
    if (!hasTime) return 0;
    if (!user.total_seconds || user.total_seconds <= 0) return 0;

    const raw = (liveRemaining / user.total_seconds) * 100;
    return Math.max(0, Math.min(100, raw));
  }, [hasTime, liveRemaining, user.total_seconds]);

  // ✅ กันลบตัวเอง
  const isSelf = currentUserId && user.id === currentUserId;

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

      {/* ✅ เวลาใช้งาน */}
      {/* ✅ เวลาใช้งาน */}
      <td className="text-center">
        {hasTime ? (
          <div className="flex flex-col items-center gap-1">
            {/* ✅ โชว์เวลาเสมอ */}
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

      {/* device */}
      <td className="text-center text-sm">
        {user.device_id ? "เชื่อมแล้ว" : "ยังไม่เชื่อม"}
      </td>

      {/* actions */}
      <td className="p-4">
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => onAction("time")}
            title="เพิ่มเวลา"
          >
            <Clock size={16} />
          </Button>

          {user.device_id ? (
            <Button
              size="icon"
              variant="outline"
              onClick={() => onAction("disconnect")}
              title="disconnect"
            >
              <Unplug size={16} />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              onClick={() => onAction("assign")}
              title="assign"
            >
              <PlusCircle size={16} />
            </Button>
          )}

          {/* ✅ hide delete ถ้า user เป็น ADMIN หรือเป็นตัวเอง */}
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
