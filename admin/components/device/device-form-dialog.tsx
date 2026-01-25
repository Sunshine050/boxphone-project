"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Device } from "./device-management-table";
import { DevicesService } from "@/services/devices.service";

interface DeviceFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  device?: Device | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeviceFormDialog({
  open,
  mode,
  device,
  onClose,
  onSuccess,
}: DeviceFormDialogProps) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(isEdit ? device?.name || "" : "");
      setSerial(isEdit ? device?.serial_number || "" : "");
    }
  }, [open, isEdit, device]);

  const handleSubmit = async () => {
    if (!name.trim()) return alert("กรุณากรอกชื่ออุปกรณ์");
    if (!serial.trim()) return alert("กรุณากรอก serial number");

    setLoading(true);
    try {
      if (isEdit) {
        if (!device?.id) throw new Error("Device id missing");
        await DevicesService.update(device.id, {
          name,
          serial_number: serial,
        });
      } else {
        await DevicesService.create({
          name,
          serial_number: serial,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="ชื่ออุปกรณ์"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Serial Number"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
          />

          {isEdit && (
            <p className="text-xs text-muted-foreground">
              * สามารถแก้ไขได้เฉพาะชื่ออุปกรณ์ / serial เท่านั้น
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "กำลังบันทึก..." : isEdit ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มอุปกรณ์"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
