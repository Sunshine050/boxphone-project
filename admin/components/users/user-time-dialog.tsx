"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import { Calendar } from "@/components/ui/calendar";

import { UsersService } from "@/services/users.service";
import { User } from "@/types/user";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function UserTimeDialog({
  user,
  open,
  onClose,
  onSuccess,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [pkg, setPkg] = useState<"1h" | "1d" | "1w" | "1m" | "1y">("1h");
  const [loading, setLoading] = useState(false);

  // ✅ Start Time: แยกเป็น date + time เพื่อใช้ง่าย
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [hour, setHour] = useState<string>("09");
  const [minute, setMinute] = useState<string>("00");

  // ✅ รวม date+time ให้เป็น Date (หรือ undefined)
  const startAt = useMemo(() => {
    if (!startDate) return undefined;

    const h = Number(hour);
    const m = Number(minute);

    const d = new Date(startDate);
    d.setHours(h);
    d.setMinutes(m);
    d.setSeconds(0);
    d.setMilliseconds(0);

    return d;
  }, [startDate, hour, minute]);

  const handleQuickNow = () => {
    const now = new Date();
    setStartDate(now);
    setHour(pad2(now.getHours()));
    setMinute(pad2(now.getMinutes()));
  };

  const handleClear = () => {
    setStartDate(undefined);
    setHour("09");
    setMinute("00");
  };

  const handleAddTime = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      await UsersService.addTime(user.id, pkg, startAt?.toISOString());
      onSuccess?.();
      onClose();

      // reset
      setStartDate(undefined);
      setHour("09");
      setMinute("00");
    } catch (err: any) {
      alert(err.message || "เพิ่มเวลาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => pad2(i));
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มเวลาใช้งาน</DialogTitle>
          <p className="text-sm text-muted-foreground">{user?.username}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* ✅ package */}
          <div className="space-y-2">
            <Label>แพ็กเกจเวลา</Label>
            <Select value={pkg} onValueChange={(v: any) => setPkg(v)}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกแพ็กเกจเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 ชั่วโมง</SelectItem>
                <SelectItem value="1d">1 วัน</SelectItem>
                <SelectItem value="1w">1 สัปดาห์</SelectItem>
                <SelectItem value="1m">1 เดือน</SelectItem>
                <SelectItem value="1y">1 ปี</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ start time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>เวลาเริ่มนับ (Start Time)</Label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQuickNow}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  เริ่มทันที
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                >
                  ล้าง
                </Button>
              </div>
            </div>

            {/* date picker */}
            <div className="flex flex-col gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "เลือกวันที่เริ่มนับ"}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-2" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* time picker */}
              <div className="flex items-center gap-2">
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="ชั่วโมง" />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">:</span>

                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="นาที" />
                  </SelectTrigger>
                  <SelectContent>
                    {minutes.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} น.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                {startAt ? (
                  <>
                    จะเริ่มนับเวลา: <span className="font-medium">{format(startAt, "PPpp")}</span>
                  </>
                ) : (
                  "ถ้าไม่เลือก ระบบจะ “เพิ่มเวลาเฉยๆ” แต่ยังไม่เริ่มนับ"
                )}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleAddTime} disabled={loading}>
            {loading ? "กำลังเพิ่ม..." : "ยืนยัน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
