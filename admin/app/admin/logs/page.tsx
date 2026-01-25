"use client";

import { ReactNode, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Search,
  Filter,
  UserPlus,
  Clock,
  Link2,
  Unplug,
  Bell,
  ShieldAlert,
  Eye,
} from "lucide-react";

/* ================= TYPES ================= */

type LogType =
  | "USER_CREATED"
  | "TIME_ADDED"
  | "DEVICE_ASSIGNED"
  | "DEVICE_DISCONNECTED"
  | "DEVICE_AVAILABLE_ALERT"
  | "SYSTEM_WARNING";

type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

type AdminLog = {
  id: string;
  type: LogType;
  level: LogLevel;
  message: string;

  // optional data
  user?: {
    id: string;
    username: string;
    name?: string;
  };

  device?: {
    id: string;
    name: string;
    serial_number: string;
  };

  time?: {
    seconds: number;
    hoursText: string;
    packageKey?: string;
  };

  createdAt: string; // ISO
  createdBy?: string; // admin username
  meta?: Record<string, any>;
};

/* ================= MOCK DATA ================= */

function toHoursText(sec: number) {
  return `${(sec / 3600).toFixed(2)} ชม.`;
}

const MOCK_LOGS: AdminLog[] = [
  {
    id: "log_001",
    type: "USER_CREATED",
    level: "SUCCESS",
    message: "สร้างผู้ใช้ใหม่สำเร็จ",
    user: { id: "u1", username: "tenzo_user01", name: "Tenzo" },
    createdAt: "2026-01-25T08:20:00.000Z",
    createdBy: "admin",
    meta: { ip: "192.168.1.10" },
  },
  {
    id: "log_002",
    type: "TIME_ADDED",
    level: "INFO",
    message: "เพิ่มเวลาให้ผู้ใช้",
    user: { id: "u1", username: "tenzo_user01" },
    time: { seconds: 3600, hoursText: toHoursText(3600), packageKey: "1h" },
    createdAt: "2026-01-25T08:21:12.000Z",
    createdBy: "admin",
    meta: { note: "เติมเวลาให้เริ่มใช้งานได้" },
  },
  {
    id: "log_003",
    type: "DEVICE_ASSIGNED",
    level: "SUCCESS",
    message: "มอบหมายอุปกรณ์ให้ผู้ใช้",
    user: { id: "u1", username: "tenzo_user01" },
    device: { id: "d1", name: "Android-005", serial_number: "SN-A005" },
    time: { seconds: 7200, hoursText: toHoursText(7200), packageKey: "custom" },
    createdAt: "2026-01-25T08:22:40.000Z",
    createdBy: "admin",
    meta: { assignMode: "multi-device" },
  },
  {
    id: "log_004",
    type: "DEVICE_AVAILABLE_ALERT",
    level: "WARNING",
    message: "มีเครื่องว่างพร้อมใช้งานจำนวนมาก",
    createdAt: "2026-01-25T08:30:00.000Z",
    createdBy: "system",
    meta: { available: 12 },
  },
  {
    id: "log_005",
    type: "DEVICE_DISCONNECTED",
    level: "INFO",
    message: "ผู้ใช้ถูกตัดการเชื่อมต่อจากอุปกรณ์",
    user: { id: "u2", username: "guest_007" },
    device: { id: "d2", name: "Android-007", serial_number: "SN-A007" },
    createdAt: "2026-01-25T09:05:00.000Z",
    createdBy: "admin",
    meta: { reason: "หมดเวลา" },
  },
  {
    id: "log_006",
    type: "SYSTEM_WARNING",
    level: "ERROR",
    message: "Device OFFLINE ตรวจพบการเชื่อมต่อขาดหาย",
    device: { id: "d3", name: "Android-002", serial_number: "SN-A002" },
    createdAt: "2026-01-25T09:12:45.000Z",
    createdBy: "system",
    meta: { last_seen: "09:10", suggested: "ตรวจ Wi-Fi / Power" },
  },
];

/* ================= UI MAP ================= */

function getLevelBadge(level: LogLevel) {
  switch (level) {
    case "SUCCESS":
      return "bg-green-500/10 text-green-500 border-green-500/30";
    case "INFO":
      return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    case "WARNING":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
    case "ERROR":
      return "bg-red-500/10 text-red-500 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getTypeBadge(type: LogType) {
  const map: Record<LogType, { label: string; icon: ReactNode }> = {
    USER_CREATED: {
      label: "เพิ่มผู้ใช้",
      icon: <UserPlus className="h-4 w-4" />,
    },
    TIME_ADDED: {
      label: "เพิ่มเวลา",
      icon: <Clock className="h-4 w-4" />,
    },
    DEVICE_ASSIGNED: {
      label: "Assign เครื่อง",
      icon: <Link2 className="h-4 w-4" />,
    },
    DEVICE_DISCONNECTED: {
      label: "Disconnect",
      icon: <Unplug className="h-4 w-4" />,
    },
    DEVICE_AVAILABLE_ALERT: {
      label: "แจ้งเตือนเครื่องว่าง",
      icon: <Bell className="h-4 w-4" />,
    },
    SYSTEM_WARNING: {
      label: "ระบบแจ้งเตือน",
      icon: <ShieldAlert className="h-4 w-4" />,
    },
  };

  return map[type];
}


/* ================= PAGE ================= */

export default function AdminLogsPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<LogType | "all">("all");
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);

  const logs = MOCK_LOGS;

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const q = query.trim().toLowerCase();

      const matchQuery =
        q.length === 0 ||
        l.message.toLowerCase().includes(q) ||
        l.user?.username?.toLowerCase().includes(q) ||
        l.device?.name?.toLowerCase().includes(q) ||
        l.device?.serial_number?.toLowerCase().includes(q);

      const matchType = typeFilter === "all" || l.type === typeFilter;
      return matchQuery && matchType;
    });
  }, [logs, query, typeFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 sm:p-8 space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-1">Activity Logs</h1>
        <p className="text-sm text-muted-foreground">
          ดูประวัติการกระทำของแอดมิน + แจ้งเตือนระบบ (Mock Data)
        </p>
      </div>

      {/* Filter bar */}
      <Card className="border-border/70">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา: username / device / serial / message"
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              ทั้งหมด
            </Button>

            {(
              [
                "USER_CREATED",
                "TIME_ADDED",
                "DEVICE_ASSIGNED",
                "DEVICE_DISCONNECTED",
                "DEVICE_AVAILABLE_ALERT",
                "SYSTEM_WARNING",
              ] as LogType[]
            ).map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t)}
              >
                {getTypeBadge(t).label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            รายการ Logs ({filtered.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                ไม่พบข้อมูล Logs
              </div>
            )}

            {filtered.map((l, idx) => {
              const typeBadge = getTypeBadge(l.type);

              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Left */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="gap-1 border bg-muted text-muted-foreground">
                        {typeBadge.icon}
                        {typeBadge.label}
                      </Badge>

                      <Badge className={getLevelBadge(l.level)}>{l.level}</Badge>

                      {l.user?.username && (
                        <Badge className="border bg-background text-foreground">
                          @{l.user.username}
                        </Badge>
                      )}

                      {l.device?.name && (
                        <Badge className="border bg-background text-foreground">
                          {l.device.name}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm font-medium">{l.message}</div>

                    <div className="text-xs text-muted-foreground">
                      เวลา: {new Date(l.createdAt).toLocaleString()} • โดย:{" "}
                      {l.createdBy || "unknown"}
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setSelectedLog(l)}
                    >
                      <Eye className="h-4 w-4" />
                      ดูรายละเอียด
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>รายละเอียด Log</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge className="border bg-muted text-muted-foreground">
                  {getTypeBadge(selectedLog.type).label}
                </Badge>
                <Badge className={getLevelBadge(selectedLog.level)}>
                  {selectedLog.level}
                </Badge>
              </div>

              <div className="rounded-xl border p-3 space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Message</div>
                  <div className="font-medium">{selectedLog.message}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Created By</div>
                    <div className="font-medium">
                      {selectedLog.createdBy || "-"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Created At</div>
                    <div className="font-medium">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {selectedLog.user && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">User</div>
                      <div className="font-medium">@{selectedLog.user.username}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">User ID</div>
                      <div className="font-medium">{selectedLog.user.id}</div>
                    </div>
                  </div>
                )}

                {selectedLog.device && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Device</div>
                      <div className="font-medium">{selectedLog.device.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Serial</div>
                      <div className="font-medium">
                        {selectedLog.device.serial_number}
                      </div>
                    </div>
                  </div>
                )}

                {selectedLog.time && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Time Added</div>
                      <div className="font-medium">{selectedLog.time.hoursText}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Seconds</div>
                      <div className="font-medium">{selectedLog.time.seconds}</div>
                    </div>
                  </div>
                )}
              </div>

              {selectedLog.meta && (
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    Metadata
                  </div>
                  <pre className="text-xs overflow-auto max-h-48 bg-muted/40 p-3 rounded-xl">
{JSON.stringify(selectedLog.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
