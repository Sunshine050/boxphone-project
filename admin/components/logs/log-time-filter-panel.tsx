"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { normalizeTimeInput } from "@/lib/logs-helpers";

const PRESETS: readonly { label: string; start: string; end: string }[] = [
  { label: "ทั้งวัน", start: "", end: "" },
  { label: "เช้า 9:00–12:00", start: "09:00", end: "12:00" },
  { label: "บ่าย 13:00–18:00", start: "13:00", end: "18:00" },
  { label: "8:00–18:00", start: "08:00", end: "18:00" },
];

/** ช่อง native time — หน้าตาเดิม คอนทราสต์ชัด */
const TIME_RANGE_INPUT_CLASS = cn(
  "h-14 min-h-14 w-full min-w-0 rounded-xl border-2 px-4 py-3",
  "bg-muted/80 text-lg font-semibold tabular-nums text-foreground shadow-sm",
  "border-border/90 ring-1 ring-border/30",
  "transition-[border-color,box-shadow,background-color]",
  "hover:border-primary/45 hover:bg-muted hover:shadow-md",
  "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "dark:border-primary/40 dark:bg-secondary/80 dark:ring-primary/20",
  "dark:hover:border-primary/60 dark:hover:bg-secondary",
  "[&::-webkit-calendar-picker-indicator]:ml-1 [&::-webkit-calendar-picker-indicator]:size-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90",
  "dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:opacity-100",
  "sm:h-12 sm:min-h-12 sm:text-base",
);

function openNativeTimePicker(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  } catch {
    el.focus();
  }
}

/** กล่อง `<input type="time">` แบบเดิม — แตะทั้งกล่องเปิดตัวเลือกของระบบ */
function NativeTimeField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      className="cursor-pointer touch-manipulation"
      onClick={() => openNativeTimePicker(ref.current)}
    >
      <input
        ref={ref}
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(TIME_RANGE_INPUT_CLASS, "pointer-events-none")}
      />
    </div>
  );
}

function formatTimeSummary(start: string, end: string): string {
  if (!start?.trim() && !end?.trim()) return "ทั้งวัน · ไม่จำกัดเวลา";
  if (start?.trim() && end?.trim()) return `${start} – ${end}`;
  if (start?.trim()) return `ตั้งแต่ ${start}`;
  return `จนถึง ${end}`;
}

interface LogTimeFilterPanelProps {
  hasDate: boolean;
  timeStart: string;
  timeEnd: string;
  onApply: (start: string, end: string) => void;
  /** true = Sheet จากด้านล่าง (มือถือ / iPad); false = Dialog กลางจอ */
  useSheetLayout: boolean;
  onRequestDateFirst?: () => void;
}

export function LogTimeFilterPanel({
  hasDate,
  timeStart,
  timeEnd,
  onApply,
  useSheetLayout,
  onRequestDateFirst,
}: LogTimeFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");

  const timeStartFieldId = useId();
  const timeEndFieldId = useId();

  useEffect(() => {
    if (open) {
      setDraftStart(timeStart);
      setDraftEnd(timeEnd);
    }
  }, [open, timeStart, timeEnd]);

  const handleOpen = () => {
    if (!hasDate) {
      onRequestDateFirst?.();
      return;
    }
    setOpen(true);
  };

  const handleApply = () => {
    onApply(normalizeTimeInput(draftStart), normalizeTimeInput(draftEnd));
    setOpen(false);
  };

  /** Presets commit immediately so users are not stuck if they skip the Apply button. */
  const applyPreset = (start: string, end: string) => {
    const ns = normalizeTimeInput(start);
    const ne = normalizeTimeInput(end);
    setDraftStart(start);
    setDraftEnd(end);
    onApply(ns, ne);
    setOpen(false);
  };

  const formFields = (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="ช่วงเวลาลัด">
        {PRESETS.map((p) => {
          const active = draftStart === p.start && draftEnd === p.end;
          return (
            <Button
              key={p.label}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className="h-9 rounded-lg px-3 text-xs font-medium"
              onClick={() => applyPreset(p.start, p.end)}
            >
              {p.label}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="min-w-0 space-y-2">
          <label
            htmlFor={timeStartFieldId}
            className="block cursor-pointer text-sm font-medium text-foreground/90"
          >
            ตั้งแต่
          </label>
          <NativeTimeField
            id={timeStartFieldId}
            value={draftStart}
            onChange={setDraftStart}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <label
            htmlFor={timeEndFieldId}
            className="block cursor-pointer text-sm font-medium text-foreground/90"
          >
            ถึง
          </label>
          <NativeTimeField
            id={timeEndFieldId}
            value={draftEnd}
            onChange={setDraftEnd}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        ปุ่มช่วงเวลาลัดด้านบนใช้ทันที — แก้ช่องเวลาด้านล่างแล้วกด「ใช้ตัวกรองเวลา」
      </p>
      <p className="text-xs text-muted-foreground">
        ปล่อยทั้งสองช่องว่าง = ดู log ทั้งวันตามวันที่เลือก
      </p>
    </>
  );

  const intro = (
    <p className="text-sm text-muted-foreground">
      เวลาตามเครื่องนี้ — ใช้กับช่วงวันที่ที่เลือกในปฏิทิน
    </p>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={!hasDate}
        onClick={handleOpen}
        className={cn(
          "h-11 min-h-11 w-full justify-between gap-3 rounded-xl border-border/70 bg-muted/25 px-3.5 text-left font-normal shadow-sm",
          !hasDate && "cursor-not-allowed opacity-60",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <Clock className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
          <span className="min-w-0 truncate text-sm">
            {hasDate ? (
              formatTimeSummary(timeStart, timeEnd)
            ) : (
              <span className="text-muted-foreground">
                เลือกวันที่ก่อน แล้วแตะเพื่อกรองเวลา
              </span>
            )}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </Button>

      {useSheetLayout ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-t-2xl border-t p-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <SheetHeader className="shrink-0 space-y-1 px-4 pt-4 pb-2 text-left sm:px-6">
              <SheetTitle className="text-lg">กรองตามเวลา</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-2 sm:px-6">
              {intro}
              {formFields}
            </div>
            <SheetFooter className="shrink-0 flex-col gap-2 border-t border-border/60 bg-muted/15 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={handleApply}
              >
                ใช้ตัวกรองเวลา
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] max-w-md gap-0 overflow-y-auto p-0 sm:max-w-lg">
            <DialogHeader className="space-y-2 border-b border-border/60 px-6 py-4 text-left">
              <DialogTitle>กรองตามเวลา</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-6 py-4">
              {intro}
              {formFields}
            </div>
            <DialogFooter className="gap-2 border-t border-border/60 bg-muted/15 px-6 py-4 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="button" onClick={handleApply}>
                ใช้ตัวกรองเวลา
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
