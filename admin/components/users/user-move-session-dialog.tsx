"use client";

import { useEffect, useState } from "react";
import { SessionsService } from "@/services/sessions.service";
import { DevicesService } from "@/services/devices.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Device = {
  id: string;
  name: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
};

export function UserMoveSessionDialog({
  open,
  sessionId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  sessionId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    (async () => {
      const list: any[] = await DevicesService.getAll();
      const available = list
        .map((d) => ({
          id: String(d._id || d.id),
          name: d.name,
          status: d.status,
        }))
        .filter((d) => d.status === "AVAILABLE");

      setDevices(available);
    })();
  }, [open]);

  const handleMove = async () => {
    if (!sessionId || !selected) return;

    await SessionsService.move(sessionId, {
      to_device_id: selected,
      reason: "Admin moved device",
    });

    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ย้าย Session ไปเครื่องอื่น</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกเครื่องที่ว่าง" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleMove} disabled={!selected}>
            ย้ายเครื่อง
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}