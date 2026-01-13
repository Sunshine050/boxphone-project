"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { User } from "@/types/user";
import { UsersService } from "@/services/users.service";

/* ✅ MOCK DEVICES (เดี๋ยวค่อยต่อ API จริง) */
const availableDevices = [
  { id: "PHONE-01", name: "Pixel 8 Pro" },
  { id: "PHONE-02", name: "Galaxy S24" },
  { id: "PHONE-03", name: "Pixel 7a" },
];

interface Props {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserAssignDeviceDialog({
  user,
  open,
  onClose,
  onSuccess,
}: Props) {
  const [deviceId, setDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!user?.id) return;
    if (!deviceId) return;

    setLoading(true);
    try {
      await UsersService.connectDevice(user.id, deviceId);
      onSuccess?.();
      onClose();
      setDeviceId("");
    } catch (err: any) {
      alert(err.message || "Assign device ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>กำหนดเครื่องให้ผู้ใช้</DialogTitle>
          <p className="text-sm text-muted-foreground">{user?.username}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">เลือกอุปกรณ์</label>
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกเครื่อง" />
              </SelectTrigger>
              <SelectContent>
                {availableDevices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleAssign} disabled={loading || !deviceId}>
            {loading ? "กำลังบันทึก..." : "ยืนยันการกำหนดเครื่อง"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
