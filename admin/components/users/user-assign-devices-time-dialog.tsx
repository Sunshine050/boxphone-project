"use client";

import { useMemo, useState, useEffect } from "react";
import { User } from "@/types/user";
import { UsersService } from "@/services/users.service";
import { DevicesService } from "@/services/devices.service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Plus, Trash2 } from "lucide-react";
import { normalizeDeviceStatus } from "@/lib/device-status";

/** ✅ Packages */
type PackageKey = "1d" | "7d" | "30d" | "90d" | "180d" | "365d" | "custom";

const PACKAGE_SECONDS: Record<Exclude<PackageKey, "custom">, number> = {
  "1d": 60 * 60 * 24,
  "7d": 60 * 60 * 24 * 7,
  "30d": 60 * 60 * 24 * 30,
  "90d": 60 * 60 * 24 * 90,
  "180d": 60 * 60 * 24 * 180,
  "365d": 60 * 60 * 24 * 365,
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

type DeviceItem = {
  id: string;
  name: string;
  serial_number: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE" | "UNDER_REPAIR" | "DAMAGED" | "QUARANTINE";
};

type Row = {
  device_id: string;
  packageKey: PackageKey;
  customHours: string;
  customMinutes: string;
};

interface Props {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function createEmptyRow(): Row {
  return {
    device_id: "",
    packageKey: "1d",
    customHours: "0",
    customMinutes: "0",
  };
}

export function UserAssignDevicesTimeDialog({
  user,
  open,
  onClose,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([createEmptyRow()]);
  const [loading, setLoading] = useState(false);

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const deviceMap = useMemo(() => {
    return devices.reduce((acc, d) => {
      acc[d.id] = d;
      return acc;
    }, {} as Record<string, DeviceItem>);
  }, [devices]);

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const data = (await DevicesService.getAll()) as any[];
      const mapped: DeviceItem[] = data.map((d) => ({
        id: d.id || d._id,
        name: d.name,
        serial_number: d.serial_number,
        status: normalizeDeviceStatus(d.status) as DeviceItem["status"],
      }));
      setDevices(mapped);
      return mapped;
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    const u: any = user;
    let preloadRows: Row[] = [createEmptyRow()];

    if (u && Array.isArray(u.devices) && u.devices.length > 0) {
      preloadRows = u.devices.map((x: any) => {
        const sec = Number(x.remaining_seconds ?? x.total_seconds ?? 0);

        // 🔵 ถ้าตรง package ใด package หนึ่ง
        const pkg = Object.entries(PACKAGE_SECONDS).find(
          ([, v]) => v === sec
        );

        if (pkg) {
          return {
            device_id: String(x.device_id || ""),
            packageKey: pkg[0] as PackageKey,
            customHours: "0",
            customMinutes: "0",
          };
        }

        // 🔵 ถ้าไม่ตรง package → เป็น custom
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);

        return {
          device_id: String(x.device_id || ""),
          packageKey: "custom",
          customHours: String(h),
          customMinutes: String(m),
        };
      });
    }
    else if (u && u.device_id) {
      preloadRows = [
        {
          device_id: String(u.device_id),
          packageKey: "1d",
          customHours: "0",
          customMinutes: "0",
        },
      ];
    }

    setRows(preloadRows);

    (async () => {
      const list = await fetchDevices();
      setRows((prev) =>
        prev.map((r) => {
          if (!r.device_id) return r;
          const exists = list.some((d) => d.id === r.device_id);
          return exists ? r : { ...r, device_id: "" };
        })
      );
    })();
  }, [open, user?.id]);

  const selectedDeviceIds = useMemo(() => rows.map((r) => r.device_id).filter((x) => x && x.trim() !== ""), [rows]);

  const getAssignSeconds = (row: Row) => {
    if (row.packageKey !== "custom") return PACKAGE_SECONDS[row.packageKey];
    return toSecondsFromCustom(row.customHours, row.customMinutes);
  };

  const validItems = useMemo(() => {
    return rows
      .map((r) => ({ device_id: r.device_id.trim(), assign_seconds: getAssignSeconds(r) }))
      .filter((x) => x.device_id !== "" && x.assign_seconds > 0);
  }, [rows]);

  const canSubmit = useMemo(
    () => !!user?.id,
    [user?.id]
  );

  const addRow = () => setRows((prev) => [...prev, createEmptyRow()]);
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = <K extends keyof Row>(idx: number, key: K, value: Row[K]) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const historyMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!user?.device_history) return map;

    user.device_history.forEach(h => {
      map[h.device_id] = h.use_count;
    });

    return map;
  }, [user]);

  const handleSubmit = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await UsersService.assignDevices(user.id, validItems);
      toast({
        title: "กำหนดเครื่องและเวลาสำเร็จ",
        description: `${user.name} — ${validItems.length} เครื่อง`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "กำหนดเครื่องไม่สำเร็จ", description: err?.message || "เกิดข้อผิดพลาด" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* 🎯 เปลี่ยนสีพื้นหลังเป็นโทน Black/Zinc ตามธีมเว็บ */}
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[85vh] p-0 flex flex-col overflow-hidden bg-[#0c0c0e] text-zinc-100 border-zinc-800 shadow-2xl">
        <div className="px-6 pt-6 border-b border-zinc-900 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-100">กำหนด Device + เวลา (Package)</DialogTitle>
            <p className="text-sm text-zinc-500">
              ผู้ใช้: <span className="font-semibold text-blue-400">{user?.username}</span>
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[calc(85vh-140px)] space-y-4 bg-[#0c0c0e]">
          {rows.map((r, idx) => {
            const disabledSet = new Set(selectedDeviceIds.filter((id) => id !== r.device_id));
            const assignSeconds = getAssignSeconds(r);
            const currentDevice = deviceMap[r.device_id];

            return (
              <div key={idx} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4 transition-all hover:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">เครื่องที่ {idx + 1}</div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRow(idx)}
                    disabled={false}
                    className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>

                {/* 🎯 Device Select Area */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">เลือก Device</label>
                    {currentDevice && (
                      <Badge variant="outline" className={`text-[10px] border-none px-0 ${currentDevice.status === "AVAILABLE" ? "text-emerald-500" : "text-amber-500"
                        }`}>
                        ● {currentDevice.status}
                      </Badge>
                    )}
                  </div>

                  {loadingDevices ? (
                    <div className="text-xs text-zinc-600 italic">กำลังโหลดรายการเครื่อง...</div>
                  ) : (
                    <select
                      value={r.device_id}
                      onChange={(e) => updateRow(idx, "device_id", e.target.value)}
                      className="w-full border border-zinc-800 rounded-xl px-3 py-2.5 text-sm bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-zinc-950 text-zinc-500">-- เลือกเครื่องจากรายการ --</option>
                      {devices.map((d) => {
                        const isDisabled = disabledSet.has(d.id);
                        const statusIndicator = d.status === "AVAILABLE" ? "🟢" : d.status === "BUSY" ? "🟡" : d.status === "QUARANTINE" ? "🟠" : "🔴";
                        const count = historyMap[d.id] || 0;
                        const label =
                          `${d.name} • SN: ${d.serial_number} • ${d.status}` +
                          (count > 0 ? ` • ใช้ ${count} ครั้ง` : "");

                        return (
                          <option key={d.id} value={d.id} disabled={isDisabled} className="bg-zinc-950 py-2">
                            {statusIndicator} {label} {isDisabled ? " (เลือกแล้ว)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Package Buttons */}
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">เวลา (Package)</div>
                  <div className="flex flex-wrap gap-2">
                    {(["1d", "7d", "30d", "90d", "180d", "365d", "custom"] as PackageKey[]).map((k) => (
                      <Button
                        key={k}
                        type="button"
                        variant={r.packageKey === k ? "default" : "outline"}
                        onClick={() => updateRow(idx, "packageKey", k)}
                        className={`h-9 flex-1 min-w-[80px] text-xs transition-all ${r.packageKey === k
                          ? 'bg-zinc-100 text-zinc-950 hover:bg-white shadow-lg'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200'
                          }`}
                      >
                        {k === "1d" && "1 วัน"}
                        {k === "7d" && "7 วัน"}
                        {k === "30d" && "30 วัน"}
                        {k === "90d" && "90 วัน"}
                        {k === "180d" && "180 วัน"}
                        {k === "365d" && "365 วัน"}
                        {k === "custom" && "ระบุเอง"}
                      </Button>
                    ))}
                  </div>

                  {r.packageKey === "custom" && (
                    <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-zinc-600">ชั่วโมง</label>
                        <Input
                          type="number"
                          value={r.customHours}
                          onChange={(e) => updateRow(idx, "customHours", e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-zinc-200 focus:ring-0 h-9 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-zinc-600">นาที</label>
                        <Input
                          type="number"
                          value={r.customMinutes}
                          onChange={(e) => updateRow(idx, "customMinutes", e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-zinc-200 focus:ring-0 h-9 font-mono"
                        />
                      </div>
                      <div className="col-span-2 pt-1">
                        <p className="text-[10px] text-zinc-500 italic">รวมเวลา: <span className="text-emerald-500 font-medium">{secondsToHoursText(assignSeconds)}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <Button
            variant="ghost"
            onClick={addRow}
            className="gap-2 w-full border border-dashed border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 py-7 rounded-2xl transition-all"
          >
            <Plus size={18} />
            เพิ่มอุปกรณ์อีกเครื่อง
          </Button>
        </div>

        {/* Footer: ใช้สี Blue สำหรับ Action หลัก */}
        <div className="flex-shrink-0 px-6 py-6 border-t border-zinc-900 bg-[#0c0c0e]">
          <DialogFooter className="flex flex-row gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 h-11"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
            >
              {loading ? "กำลังบันทึกข้อมูล..." : "ยืนยันและเปิดใช้งาน"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}