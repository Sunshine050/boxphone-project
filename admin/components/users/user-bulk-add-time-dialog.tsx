"use client";

import { useMemo, useState } from "react";
import { UsersService } from "@/services/users.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function toSeconds(hours: string, minutes: string) {
  const h = Math.max(0, Number(hours || 0));
  const m = Math.max(0, Number(minutes || 0));
  return h * 3600 + m * 60;
}

export function UserBulkAddTimeDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const addSeconds = useMemo(() => toSeconds(hours, minutes), [hours, minutes]);

  const handleSubmit = async () => {
    if (addSeconds <= 0) {
      toast({ variant: "destructive", title: "กรุณากรอกเวลาที่เพิ่มให้มากกว่า 0" });
      return;
    }

    setLoading(true);
    try {
      const result = await UsersService.bulkAddTimeToInuse(addSeconds, note.trim() || undefined);
      const count = (result as any)?.count ?? 0;
      toast({
        title: "เพิ่มเวลาสำเร็จ",
        description: `เพิ่ม ${Math.floor(addSeconds / 60)} นาที ให้ผู้ใช้ที่กำลังใช้งาน ${count} คน${note.trim() ? ` (${note.trim()})` : ""}`,
      });
      onSuccess?.();
      onClose();
      setNote("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "เพิ่มเวลาไม่สำเร็จ", description: err?.message || "เกิดข้อผิดพลาด" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>เพิ่มเวลาให้ผู้ใช้ที่กำลังใช้งานทั้งหมด</DialogTitle>
          <p className="text-sm text-muted-foreground">
            ระบบจะเพิ่มเวลาให้ user ที่สถานะเป็น <b>INUSE</b> ทั้งหมด และแจ้ง notification พร้อมหมายเหตุ (ถ้ามี)
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">ชั่วโมง</div>
            <Input value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">นาที</div>
            <Input
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">หมายเหตุ (ส่งไปในแจ้งเตือนให้ user)</div>
          <Input
            placeholder="เช่น เติมเวลาโปรโมชั่น"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            className="placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          รวม: <span className="font-medium">{addSeconds}</span> วินาที
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "กำลังเพิ่ม..." : "ยืนยันเพิ่มเวลา"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
