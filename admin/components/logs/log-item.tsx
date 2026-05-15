"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Clock,
  Link2,
  Unplug,
  Bell,
  ShieldAlert,
  Play,
  Square,
  Smartphone,
} from "lucide-react";

import { AdminLog, LogLevel, LogType } from "@/types/log";
import { getLogTimeMs } from "@/lib/logs-helpers";

interface LogItemProps {
  log: AdminLog;
  idx: number;
  onSelect: (log: AdminLog) => void;
}

export function LogItem({ log, idx, onSelect }: LogItemProps) {
  const createdMs = getLogTimeMs(log);

  // ✅ LEVEL STYLE (เหมือนเดิม แต่ type-safe)
  const getLevelStyle = (level: LogLevel) => {
    const styles: Record<LogLevel, string> = {
      SUCCESS: "bg-green-500/10 text-green-500 border-green-500/30",
      INFO: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      WARNING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
      ERROR: "bg-red-500/10 text-red-500 border-red-500/30",
    };
    return styles[level];
  };
  const resolveLevel = (log: AdminLog): LogLevel => {
  if (log.type !== "DEVICE_DISCONNECTED") return log.level;

  const reason = log.meta?.reason;

  if (reason === "timeout") return "WARNING";
  if (reason === "network") return "WARNING";
  if (reason === "admin") return "INFO";

  // default = user logout
  return "INFO";
};
const resolvedLevel = resolveLevel(log);

  // ✅ TYPE CONFIG — รองรับ enum ใหม่จาก backend
  const getTypeConfig = (type: LogType | string) => {
    const configs: Record<string, { label: string; icon: React.ReactNode }> = {

      USER_CREATED: { label: "เพิ่มผู้ใช้", icon: <UserPlus className="h-3.5 w-3.5" /> },
      TIME_ADDED: { label: "เพิ่มเวลา", icon: <Clock className="h-3.5 w-3.5" /> },
      DEVICE_ASSIGNED: { label: "Assign เครื่อง", icon: <Link2 className="h-3.5 w-3.5" /> },
      DEVICE_DISCONNECTED: { label: "Disconnect", icon: <Unplug className="h-3.5 w-3.5" /> },

      SESSION_STARTED: { label: "เริ่มใช้งาน", icon: <Play className="h-3.5 w-3.5" /> },
      SESSION_ENDED: { label: "สิ้นสุดการใช้งาน", icon: <Square className="h-3.5 w-3.5" /> },
      DEVICE_STATUS_CHANGED: { label: "เปลี่ยนสถานะเครื่อง", icon: <Smartphone className="h-3.5 w-3.5" /> },

      DEVICE_AVAILABLE_ALERT: { label: "แจ้งเตือน", icon: <Bell className="h-3.5 w-3.5" /> },
      SYSTEM_WARNING: { label: "ระบบ", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    };

    return configs[type] || { label: type, icon: <ShieldAlert className="h-3.5 w-3.5" /> };
  };

  const typeConfig = getTypeConfig(log.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.02 }}
      className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors"
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">

          {/* TYPE BADGE */}
          <Badge variant="outline" className="gap-1.5 py-0.5">
            {typeConfig.icon}
            {typeConfig.label}
          </Badge>

          {/* LEVEL BADGE */}
        <Badge className={getLevelStyle(resolvedLevel)} variant="outline">
  {resolvedLevel}
</Badge>

          {/* USER */}
          {log.target_user_id?.username && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              @{log.target_user_id.username}
            </Badge>
          )}

          {/* DEVICE */}
          {log.target_device_id?.name && (
            <Badge variant="outline" className="text-[10px]">
              {log.target_device_id.name}
            </Badge>
          )}
        </div>

        <div className="text-sm font-medium text-foreground/90">
          {log.message}
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
          <span>
            {createdMs != null
              ? new Date(createdMs).toLocaleString("th-TH")
              : "—"}
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>โดย: {log.admin_username || "System"}</span>
        </div>
      </div>
    </motion.div>
  );
}