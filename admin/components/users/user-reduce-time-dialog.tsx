"use client";

import { useMemo, useState } from "react";
import { SessionsService } from "@/services/sessions.service";
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

function toSeconds(hours: string, minutes: string, secs: string) {
  const h = Math.max(0, Number(hours || 0));
  const m = Math.max(0, Number(minutes || 0));
  const s = Math.max(0, Number(secs || 0));
  return h * 3600 + m * 60 + s;
}

export function UserReduceTimeDialog({
  open,
  sessionId,
  deviceLabel,
  onClose,
  onSuccess,
}: {
  open: boolean;
  sessionId: string | null | undefined;
  deviceLabel?: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("10");
  const [secs, setSecs] = useState("0");
  const [loading, setLoading] = useState(false);

  const reduceSeconds = useMemo(
    () => toSeconds(hours, minutes, secs),
    [hours, minutes, secs]
  );

  const handleSubmit = async () => {
    if (!sessionId) return;
    if (reduceSeconds <= 0) {
      toast({ variant: "destructive", title: "กรุณากรอกเวลาที่ลดให้มากกว่า 0" });
      return;
    }

    setLoading(true);
    try {
      await SessionsService.reduceTime(sessionId, reduceSeconds);
      toast({
        title: "ลดเวลาสำเร็จ",
        description: `ลด ${Math.floor(reduceSeconds / 60)} นาที ${reduceSeconds % 60} วินาที${deviceLabel ? ` (${deviceLabel})` : ""}`,
      });
      onSuccess?.();
      onClose();
      setHours("0");
      setMinutes("10");
      setSecs("0");
    } catch (err: any) {
      toast({ variant: "destructive", title: "ลดเวลาไม่สำเร็จ", description: err?.message || "เกิดข้อผิดพลาด" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>ลดเวลา Session</DialogTitle>
          {deviceLabel && (
            <p className="text-sm text-muted-foreground">
              เครื่อง: <span className="font-medium text-foreground">{deviceLabel}</span>
            </p>
          )}
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">ชั่วโมง</div>
            <Input
              type="number"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">นาที</div>
            <Input
              type="number"
              min="0"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">วินาที</div>
            <Input
              type="number"
              min="0"
              value={secs}
              onChange={(e) => setSecs(e.target.value)}
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          รวมลด:{" "}
          <span className="font-medium text-destructive">{reduceSeconds}</span>{" "}
          วินาที
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading ? "กำลังลด..." : "ยืนยันลดเวลา"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
