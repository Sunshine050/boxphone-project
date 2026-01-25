"use client";

import { useMemo, useState, useEffect } from "react";
import { User } from "@/types/user";
import { UsersService } from "@/services/users.service";
import { DevicesService } from "@/services/devices.service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Plus, Trash2 } from "lucide-react";

/** ✅ Packages */
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

type DeviceItem = {
  id: string;
  name: string;
  serial_number: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
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
    packageKey: "1h",
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
  const [rows, setRows] = useState<Row[]>([createEmptyRow()]);
  const [loading, setLoading] = useState(false);

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const data = (await DevicesService.getAll()) as any[];

      const mapped: DeviceItem[] = data.map((d) => ({
        id: d.id || d._id,
        name: d.name,
        serial_number: d.serial_number,
        status: d.status,
      }));

      setDevices(mapped);
      return mapped;
    } finally {
      setLoadingDevices(false);
    }
  };

  /**
   * ✅ เปิด dialog:
   * 1) preload จาก user ก่อน (เพื่อให้ dropdown มี value ทันที)
   * 2) fetch devices list
   * 3) validate ว่า device_id ที่ preload มีจริงใน list ถ้าไม่จริง -> ล้างออก
   */
  useEffect(() => {
    if (!open) return;

    const u: any = user;

    // ✅ preload rows ก่อน
    let preloadRows: Row[] = [createEmptyRow()];

    if (u && Array.isArray(u.devices) && u.devices.length > 0) {
      preloadRows = u.devices.map((x: any) => ({
        device_id: String(x.device_id || ""),
        packageKey: "1h",
        customHours: "0",
        customMinutes: "0",
      }));
    } else if (u && u.device_id) {
      preloadRows = [
        {
          device_id: String(u.device_id),
          packageKey: "1h",
          customHours: "0",
          customMinutes: "0",
        },
      ];
    }

    setRows(preloadRows);

    // ✅ โหลด device list แล้ว validate
    (async () => {
      const list = await fetchDevices();

      setRows((prev) => {
        return prev.map((r) => {
          if (!r.device_id) return r;

          const exists = list.some((d) => d.id === r.device_id);
          if (!exists) {
            // ถ้า id ไม่ match list -> reset เป็นว่าง
            return { ...r, device_id: "" };
          }
          return r;
        });
      });
    })();
  }, [open, user?.id]);

  /** ✅ หา device ที่ถูกเลือกแล้วทั้งหมด */
  const selectedDeviceIds = useMemo(() => {
    return rows
      .map((r) => r.device_id)
      .filter((x) => x && x.trim() !== "");
  }, [rows]);

  const getAssignSeconds = (row: Row) => {
    if (row.packageKey !== "custom") return PACKAGE_SECONDS[row.packageKey];
    return toSecondsFromCustom(row.customHours, row.customMinutes);
  };

  const validItems = useMemo(() => {
    return rows
      .map((r) => ({
        device_id: r.device_id.trim(),
        assign_seconds: getAssignSeconds(r),
      }))
      .filter((x) => x.device_id !== "" && x.assign_seconds > 0);
  }, [rows]);

  const canSubmit = useMemo(() => {
    return !!user?.id && validItems.length > 0;
  }, [user?.id, validItems.length]);

  const addRow = () => setRows((prev) => [...prev, createEmptyRow()]);
  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = <K extends keyof Row>(
    idx: number,
    key: K,
    value: Row[K]
  ) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    );
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      await UsersService.assignDevices(user.id, validItems);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "Assign device + time ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[85vh] p-0 flex flex-col overflow-hidden">
        {/* Header fixed */}
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>กำหนด Device + เวลา (Package)</DialogTitle>
            <p className="text-sm text-muted-foreground">
              ผู้ใช้: <span className="font-medium">{user?.username}</span>
            </p>
          </DialogHeader>
        </div>

        {/* Scrollable */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(85vh-140px)] space-y-4">
          {rows.map((r, idx) => {
            const disabledSet = new Set(
              selectedDeviceIds.filter((id) => id !== r.device_id)
            );

            const assignSeconds = getAssignSeconds(r);

            return (
              <div key={idx} className="rounded-2xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">เครื่องที่ {idx + 1}</div>

                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    title="ลบเครื่องนี้"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>

                {/* Device Select */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    เลือก Device
                  </div>

                  {loadingDevices ? (
                    <div className="text-xs text-muted-foreground">
                      กำลังโหลดรายการเครื่อง...
                    </div>
                  ) : (
                    <select
                      value={r.device_id}
                      onChange={(e) =>
                        updateRow(idx, "device_id", e.target.value)
                      }
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
                    >
                      <option value="">-- เลือกเครื่อง --</option>

                      {devices.map((d) => {
                        const isDisabled = disabledSet.has(d.id);
                        const label = `${d.name} • SN: ${d.serial_number} • ${d.status} • +${secondsToHoursText(
                          assignSeconds
                        )}`;

                        return (
                          <option key={d.id} value={d.id} disabled={isDisabled}>
                            {label}
                            {isDisabled ? " (เลือกแล้ว)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Package */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    เวลา (Package)
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(
                      ["1h", "1d", "1w", "1m", "1y", "custom"] as PackageKey[]
                    ).map((k) => (
                      <Button
                        key={k}
                        type="button"
                        variant={r.packageKey === k ? "default" : "outline"}
                        onClick={() => updateRow(idx, "packageKey", k)}
                        className="h-9"
                      >
                        {k === "1h" && "1 ชั่วโมง"}
                        {k === "1d" && "1 วัน"}
                        {k === "1w" && "1 สัปดาห์"}
                        {k === "1m" && "1 เดือน"}
                        {k === "1y" && "1 ปี"}
                        {k === "custom" && "Custom"}
                      </Button>
                    ))}
                  </div>

                  {r.packageKey === "custom" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          ชั่วโมง
                        </div>
                        <Input
                          value={r.customHours}
                          onChange={(e) =>
                            updateRow(idx, "customHours", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">นาที</div>
                        <Input
                          value={r.customMinutes}
                          onChange={(e) =>
                            updateRow(idx, "customMinutes", e.target.value)
                          }
                        />
                      </div>

                      <div className="text-xs text-muted-foreground sm:col-span-2">
                        รวม:{" "}
                        <span className="font-medium">
                          {secondsToHoursText(assignSeconds)}
                        </span>
                        {"  "}({assignSeconds} วินาที)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <Button
            variant="outline"
            onClick={addRow}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus size={16} />
            เพิ่มเครื่อง
          </Button>

          <p className="text-xs text-muted-foreground">
            ✅ เครื่องที่เลือกไปแล้วจะถูกปิด (สีเทา) ในแถวอื่นอัตโนมัติ
          </p>
        </div>

        {/* Footer fixed */}
        <div className="px-6 pb-6 pt-4 border-t bg-background">
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
              {loading ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
