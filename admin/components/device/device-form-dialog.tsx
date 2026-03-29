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
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
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
    if (!name.trim()) {
      toast({ variant: "destructive", title: "กรุณากรอกชื่ออุปกรณ์" });
      return;
    }
    if (!serial.trim()) {
      toast({ variant: "destructive", title: "กรุณากรอก Serial Number" });
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        if (!device?.id) throw new Error("Device id missing");
        await DevicesService.update(device.id, {
          name,
          serial_number: serial,
        });
        toast({ title: "แก้ไขอุปกรณ์สำเร็จ", description: name });
      } else {
        await DevicesService.create({
          name,
          serial_number: serial,
        });
        toast({ title: "เพิ่มอุปกรณ์สำเร็จ", description: `${name} (${serial})` });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: isEdit ? "แก้ไขไม่สำเร็จ" : "เพิ่มอุปกรณ์ไม่สำเร็จ",
        description: err?.message || "เกิดข้อผิดพลาด",
      });
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
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <Input
            placeholder="Serial Number"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
