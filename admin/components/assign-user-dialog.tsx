"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  open: boolean;
  device: {
    id: string;
    name: string;
    serial_number?: string;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AssignUserDialog({ open, device, onClose, onSuccess }: AssignUserDialogProps) {
  const [users, setUsers] = useState<UserMini[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const [packageKey, setPackageKey] = useState<PackageKey>("1h");
  const [customHours, setCustomHours] = useState("0");
  const [customMinutes, setCustomMinutes] = useState("0");

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

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId]
  );

  const canSubmit = useMemo(() => {
    if (!selectedUserId) return false;
    if (!device?.id) return false;
    if (assignSeconds <= 0) return false;
    return true;
  }, [selectedUserId, device, assignSeconds]);

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

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg bg-[#0c0c0e] text-zinc-100 border-zinc-800 p-0 flex flex-col overflow-hidden">
        <div className="px-6 pt-6 border-b border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-zinc-100">
              มอบหมายอุปกรณ์ให้ผู้ใช้
            </DialogTitle>
            <p className="text-sm text-zinc-500 mt-1">
              {device.name}
              {device.serial_number ? (
                <span className="ml-2 font-mono text-xs">SN: {device.serial_number}</span>
              ) : null}
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* ผู้ใช้ — ค้นหาได้ + dropdown มี scroll ไม่ยาวเกิน */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              ผู้ใช้งาน
            </label>
            {loadingUsers ? (
              <p className="text-sm text-zinc-500">กำลังโหลดรายชื่อผู้ใช้...</p>
            ) : (
              <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userDropdownOpen}
                    className="w-full justify-between bg-zinc-950 border-zinc-800 text-zinc-200 hover:bg-zinc-900 hover:text-zinc-100"
                  >
                    {selectedUser
                      ? `${selectedUser.username}${selectedUser.name ? ` • ${selectedUser.name}` : ""}`
                      : "เลือกผู้ใช้..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-950 border-zinc-800" align="start">
                  <Command className="rounded-lg border-0 bg-zinc-950">
                    <CommandInput
                      placeholder="ค้นหาชื่อหรือ username..."
                      value={userSearch}
                      onValueChange={setUserSearch}
                      className="text-zinc-200 placeholder:text-zinc-500 border-zinc-800"
                    />
                    <CommandList className="max-h-[220px] overflow-y-auto">
                      <CommandEmpty>ไม่พบผู้ใช้</CommandEmpty>
                      <CommandGroup>
                        {filteredUsers.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.username} ${u.name ?? ""}`}
                            onSelect={() => {
                              setSelectedUserId(u.id);
                              setUserSearch("");
                              setUserDropdownOpen(false);
                            }}
                            className="text-zinc-200 aria-selected:bg-zinc-800"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === u.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {u.username}
                            {u.name ? ` • ${u.name}` : ""}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* แพ็กเกจเวลา */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              เวลา (Package)
            </label>
            <div className="flex flex-wrap gap-2">
              {(["1h", "1d", "1w", "1m", "1y", "custom"] as PackageKey[]).map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant={packageKey === k ? "default" : "outline"}
                  size="sm"
                  className={
                    packageKey === k
                      ? "bg-zinc-100 text-zinc-950 hover:bg-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }
                  onClick={() => setPackageKey(k)}
                >
                  {k === "1h" && "1 ชม."}
                  {k === "1d" && "1 วัน"}
                  {k === "1w" && "1 สัปดาห์"}
                  {k === "1m" && "1 เดือน"}
                  {k === "1y" && "1 ปี"}
                  {k === "custom" && "ระบุเอง"}
                </Button>
              ))}
            </div>
            {packageKey === "custom" && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">ชม.</label>
                  <Input
                    type="number"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">นาที</label>
                  <Input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 h-9"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-zinc-500">
              รวม: <span className="font-medium text-emerald-500">{secondsToHoursText(assignSeconds)}</span>
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-zinc-800 gap-2">
          <Button variant="ghost" className="text-zinc-400 hover:text-zinc-200" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            disabled={!canSubmit || saving}
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-500"
          >
            {saving ? "กำลังบันทึก..." : "ยืนยันการมอบหมาย"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
