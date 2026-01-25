"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { UsersService } from "@/services/users.service";

type PackageKey = "1h" | "1d" | "1w" | "1m" | "1y" | "custom";

const PACKAGE_SECONDS: Record<Exclude<PackageKey, "custom">, number> = {
  "1h": 60 * 60,
  "1d": 60 * 60 * 24,
  "1w": 60 * 60 * 24 * 7,
  "1m": 60 * 60 * 24 * 30,
  "1y": 60 * 60 * 24 * 365,
};

function toSecondsFromCustom(hours: string, minutes: string) {
  const h = Math.max(0, Number(hours || 0));
  const m = Math.max(0, Number(minutes || 0));
  return h * 3600 + m * 60;
}

function secondsToHoursText(seconds: number) {
  if (!seconds || seconds <= 0) return "0 ชม.";
  return `${(seconds / 3600).toFixed(2)} ชม.`;
}

type UserMini = {
  id: string;
  username: string;
  name?: string;
  status?: string;
  role?: string;
};

interface AssignUserDialogProps {
  device: {
    id: string;
    name: string;
    serial_number?: string;
  };
  onClose: () => void;
  onSuccess?: () => void; // ✅ เพิ่ม เพื่อให้ refresh ได้
}

export function AssignUserDialog({ device, onClose, onSuccess }: AssignUserDialogProps) {
  const [users, setUsers] = useState<UserMini[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [packageKey, setPackageKey] = useState<PackageKey>("1h");
  const [customHours, setCustomHours] = useState("0");
  const [customMinutes, setCustomMinutes] = useState("0");

  const [startTime, setStartTime] = useState<string>(""); // optional
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = (await UsersService.getAll()) as any[];

      const mapped: UserMini[] = data.map((u) => ({
        id: u.id || u._id,
        username: u.username,
        name: u.name,
        status: u.status,
        role: u.role,
      }));

      // ✅ เอาเฉพาะ USER (ไม่เอา ADMIN)
      const filtered = mapped.filter((u) => u.role !== "ADMIN");

      setUsers(filtered);
    } catch (err: any) {
      alert(err.message || "โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const assignSeconds = useMemo(() => {
    if (packageKey !== "custom") return PACKAGE_SECONDS[packageKey];
    return toSecondsFromCustom(customHours, customMinutes);
  }, [packageKey, customHours, customMinutes]);

  const canSubmit = useMemo(() => {
    if (!selectedUserId) return false;
    if (!device?.id) return false;
    if (assignSeconds <= 0) return false;
    return true;
  }, [selectedUserId, device?.id, assignSeconds]);

  const handleConfirm = async () => {
    if (!canSubmit) return;

    setSaving(true);
    try {
      /**
       * ✅ ยิง API: assign device + เวลา
       * ต้องมีใน UsersService:
       * UsersService.assignDevices(userId, [{ device_id, assign_seconds }])
       */
      await UsersService.assignDevices(selectedUserId, [
        {
          device_id: device.id,
          assign_seconds: assignSeconds,
          start_time: startTime || undefined, // (optional) ถ้า backend รองรับ
        },
      ]);

      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "มอบหมายอุปกรณ์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="
            bg-card rounded-2xl w-full max-w-lg 
            border border-border/60 shadow-xl
            p-6 space-y-5
          "
        >
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">มอบหมายอุปกรณ์ให้ผู้ใช้</h2>
            <p className="text-sm text-muted-foreground">
              {device.name}
              {device.serial_number ? (
                <span className="ml-2 font-mono text-xs">
                  (SN: {device.serial_number})
                </span>
              ) : null}
            </p>
          </div>

          {/* ผู้ใช้ */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ผู้ใช้งาน</label>

            {loadingUsers ? (
              <div className="text-sm text-muted-foreground">
                กำลังโหลดรายชื่อผู้ใช้...
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้ใช้" />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  {users.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      ไม่มีผู้ใช้ให้เลือก
                    </div>
                  ) : (
                    users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username}
                        {u.name ? ` • ${u.name}` : ""}
                        {u.status ? ` • ${u.status}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* package */}
          <div className="space-y-2">
            <label className="text-sm font-medium">แพ็กเกจเวลา</label>

            <div className="flex flex-wrap gap-2">
              {(["1h", "1d", "1w", "1m", "1y", "custom"] as PackageKey[]).map(
                (k) => (
                  <Button
                    key={k}
                    type="button"
                    variant={packageKey === k ? "default" : "outline"}
                    className="h-9"
                    onClick={() => setPackageKey(k)}
                  >
                    {k === "1h" && "1 ชั่วโมง"}
                    {k === "1d" && "1 วัน"}
                    {k === "1w" && "1 สัปดาห์"}
                    {k === "1m" && "1 เดือน"}
                    {k === "1y" && "1 ปี"}
                    {k === "custom" && "Custom"}
                  </Button>
                )
              )}
            </div>

            {/* custom time */}
            {packageKey === "custom" && (
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">ชั่วโมง</label>
                  <Input
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    inputMode="numeric"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">นาที</label>
                  <Input
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    inputMode="numeric"
                  />
                </div>

                <div className="col-span-2 text-xs text-muted-foreground">
                  รวมเวลา:{" "}
                  <span className="font-medium">{secondsToHoursText(assignSeconds)}</span>
                  <span className="ml-2 font-mono">({assignSeconds} วินาที)</span>
                </div>
              </div>
            )}

            {/* summary */}
            {packageKey !== "custom" && (
              <div className="text-xs text-muted-foreground">
                รวมเวลา:{" "}
                <span className="font-medium">{secondsToHoursText(assignSeconds)}</span>
              </div>
            )}
          </div>

          {/* start time */}
          <div className="space-y-1">
            <label className="text-sm font-medium">เวลาเริ่มต้นใช้งาน (ไม่บังคับ)</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ถ้าไม่เลือก ระบบจะให้เริ่มนับเมื่อผู้ใช้เชื่อมต่อเครื่องจริง
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              disabled={!canSubmit || saving}
              onClick={handleConfirm}
            >
              {saving ? "กำลังบันทึก..." : "ยืนยันการมอบหมาย"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
