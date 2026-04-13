"use client";

import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, RotateCw, Trash2, Download, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale/th";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { AdminLog, LogType } from "@/types/log";
import { LogItem } from "@/components/logs/log-item";
import { LogTimeFilterPanel } from "@/components/logs/log-time-filter-panel";
import { apiFetch } from "@/services/api";
import { UsersService } from "@/services/users.service";
import useSWR from "swr";
import { HelpButton } from "@/components/help/help-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  logMatchesSearchQuery,
  logMatchesDateTimeRange,
  downloadLogsCsv,
} from "@/lib/logs-helpers";

const PAGE_SIZE = 10;

export default function AdminLogsPage() {
  const isMobile = useIsMobile();
  /** จอ ≤1023px (มือถือ + iPad): Sheet ด้านล่าง — จอกว่าใช้ Dialog */
  const [narrowForTimePanel, setNarrowForTimePanel] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setNarrowForTimePanel(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<LogType | "all">("all");
  const [page, setPage] = useState(1);
  const [clearing, setClearing] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const { data: rawLogs, isLoading: isLogsLoading, mutate: mutateLogs } = useSWR(
    "/api/admin-logs",
    () => apiFetch<AdminLog[]>("/admin-logs"),
    { refreshInterval: 10000 },
  );

  const { data: me } = useSWR("/api/users/me", () => UsersService.getMe(), {
    revalidateOnFocus: false,
  });
  const isAdmin = me?.role === "ADMIN";

  const loading = isLogsLoading && !rawLogs;
  const logs = rawLogs || [];

  const fetchLogs = async () => {
    await mutateLogs();
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchType = typeFilter === "all" || l.type === typeFilter;
      return (
        matchType &&
        logMatchesDateTimeRange(l, dateRange, timeStart, timeEnd) &&
        logMatchesSearchQuery(l, query)
      );
    });
  }, [logs, query, typeFilter, dateRange, timeStart, timeEnd]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, page]);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, dateRange, timeStart, timeEnd]);

  const hasDateSelected = Boolean(dateRange?.from);

  const handleArchiveAndClear = async () => {
    setClearing(true);
    try {
      const result = await apiFetch<{
        archived: number;
        cleared: boolean;
        sheetsBackupSkipped?: boolean;
      }>("/admin-logs/archive-and-clear", {
        method: "POST",
        body: { confirm: true },
      });
      toast({
        title: "สำเร็จ",
        description: result.sheetsBackupSkipped
          ? `ลบ ${result.archived} รายการจากระบบแล้ว (ยังไม่ได้ตั้งค่า Google Sheets — ไม่มีสำรองใน Sheet)`
          : `ส่งเก็บ ${result.archived} รายการไป Google Sheets แล้ว และล้าง log บนเว็บแล้ว`,
      });
      await mutateLogs();
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
      if (
        /insufficient|forbidden|403|Insufficient permissions/i.test(msg) ||
        msg === "API Error"
      ) {
        msg =
          "ต้องใช้บัญชีแอดมินเท่านั้น — ล็อกอินเป็นผู้ดูแลระบบ (ADMIN) แล้วลองอีกครั้ง";
      }
      toast({
        variant: "destructive",
        title: "ไม่สามารถเคลียร์ log ได้",
        description: msg,
      });
    } finally {
      setClearing(false);
      setClearDialogOpen(false);
    }
  };

  const handleCsv = () => {
    if (filteredLogs.length === 0) {
      toast({
        title: "ไม่มีข้อมูล",
        description: "ไม่มี log ตามตัวกรองปัจจุบัน",
      });
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadLogsCsv(filteredLogs, `activity-logs-${stamp}.csv`);
    toast({
      title: "ดาวน์โหลดแล้ว",
      description: `บันทึก ${filteredLogs.length} รายการเป็น CSV`,
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Activity Logs</h1>
            <HelpButton topic="logs" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            บันทึกเหตุการณ์และการทำงานของระบบทั้งหมด
          </p>
          {me && !isAdmin ? (
            <p className="mt-1 max-w-md text-xs text-amber-600/90 dark:text-amber-400/90">
              การเคลียร์ log ใช้ได้เฉพาะบัญชีแอดมิน — บัญชีผู้ใช้ทั่วไปดู log ได้อย่างเดียว
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-2"
                  disabled={loading || clearing}
                >
                  <Trash2 className="h-4 w-4" />
                  เคลียร์ log
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>เคลียร์ log ทั้งหมด?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span>
                      ถ้าตั้งค่า Google Sheets ใน backend แล้ว ระบบจะสำรอง log ไป Sheet ก่อน
                      จากนั้นลบออกจากฐานข้อมูลบนเว็บ
                    </span>
                    <span className="block text-muted-foreground">
                      ถ้ายังไม่ได้ตั้งค่า Google Sheets ระบบจะลบ log บนเว็บทันทีโดยไม่มีสำรองใน
                      Sheet
                    </span>
                    <span className="block text-amber-600 dark:text-amber-400">
                      งานอัตโนมัติรายเดือน: วันที่ 1 ของทุกเดือน (03:00 UTC)
                      จะส่งเก็บ log ของเดือนก่อนหน้าไป Google Sheets แล้วล้างออกจากเว็บ (เมื่อตั้งค่า
                      Sheets แล้ว)
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={clearing}>ยกเลิก</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={clearing}
                    onClick={() => void handleArchiveAndClear()}
                  >
                    {clearing ? "กำลังดำเนินการ…" : "ยืนยันเคลียร์"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}

          <Button onClick={fetchLogs} disabled={loading} size="sm" variant="outline" className="gap-2">
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <Card className="gap-0 overflow-hidden border-border/80 py-0 shadow-md">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2 md:items-start md:gap-5 lg:gap-6 xl:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                ช่วงวันที่
              </span>
              <div className="flex gap-2">
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-10 min-h-10 w-full min-w-0 flex-1 justify-start gap-2.5 rounded-xl border-border/70 bg-muted/25 px-3.5 text-left text-sm font-normal shadow-sm transition-colors hover:bg-muted/45",
                        !dateRange?.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 shrink-0 text-primary/80" />
                      <span className="truncate">
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "d MMM yyyy", { locale: th })} —{" "}
                              {format(dateRange.to, "d MMM yyyy", { locale: th })}
                            </>
                          ) : (
                            format(dateRange.from, "d MMM yyyy", { locale: th })
                          )
                        ) : (
                          "แตะเพื่อเลือกในปฏิทิน"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      locale={th}
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(r) => {
                        setDateRange(r);
                        if (r?.from && r?.to) setDatePickerOpen(false);
                      }}
                      numberOfMonths={isMobile ? 1 : 2}
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
                {dateRange?.from ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl border-border/70 bg-muted/25 shadow-sm hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setDateRange(undefined);
                      setTimeStart("");
                      setTimeEnd("");
                    }}
                    aria-label="ล้างช่วงวันที่"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  ช่วงเวลา
                </span>
                <span className="text-[10px] text-muted-foreground/90">
                  แตะเพื่อเปิดหน้าต่าง
                </span>
              </div>
              <LogTimeFilterPanel
                hasDate={hasDateSelected}
                timeStart={timeStart}
                timeEnd={timeEnd}
                useSheetLayout={narrowForTimePanel}
                onApply={(start, end) => {
                  setTimeStart(start);
                  setTimeEnd(end);
                }}
                onRequestDateFirst={() =>
                  toast({
                    title: "เลือกวันที่ก่อน",
                    description:
                      "เลือกช่วงวันที่ในปฏิทิน แล้วจึงกรองตามเวลาได้",
                  })
                }
              />
            </div>

            <div className="flex min-w-0 flex-col gap-2 md:col-span-2 xl:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                ค้นหา
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ข้อความ, ชื่อผู้ใช้, ชื่อเครื่อง…"
                  className="h-10 rounded-xl border-border/70 bg-muted/25 pl-10 pr-3 text-sm shadow-sm placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
            <p className="text-sm text-muted-foreground">
              {loading ? (
                <span className="animate-pulse">กำลังโหลดข้อมูล…</span>
              ) : (
                <>
                  พบ{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {filteredLogs.length}
                  </span>{" "}
                  รายการที่ตรงกับตัวกรอง
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <select
                className={cn(
                  "h-10 min-w-[12rem] max-w-full flex-1 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm",
                  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
                  "sm:min-w-[14rem] sm:flex-initial",
                )}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as LogType | "all")}
              >
                <option value="all">ทุกประเภทเหตุการณ์</option>
                <option value="USER_CREATED">เพิ่มผู้ใช้</option>
                <option value="TIME_ADDED">เติมเวลา</option>
                <option value="DEVICE_ASSIGNED">มอบหมายเครื่อง</option>
                <option value="DEVICE_DISCONNECTED">ตัดการเชื่อมต่อ</option>
                <option value="SESSION_STARTED">เริ่มใช้งาน</option>
                <option value="SESSION_ENDED">สิ้นสุดการใช้งาน</option>
                <option value="DEVICE_STATUS_CHANGED">เปลี่ยนสถานะเครื่อง</option>
              </select>
              <Button
                type="button"
                size="sm"
                onClick={handleCsv}
                disabled={loading}
                className={cn(
                  "h-10 shrink-0 gap-2 rounded-xl border-2 px-5 text-sm font-semibold",
                  "border-emerald-500/50 bg-emerald-500/15 text-emerald-900 shadow-sm",
                  "transition-colors hover:border-emerald-500/70 hover:bg-emerald-500/25 hover:shadow",
                  "focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-45",
                  "dark:border-emerald-400/45 dark:bg-emerald-500/15 dark:text-emerald-50",
                  "dark:hover:bg-emerald-500/25",
                )}
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                ดาวน์โหลด CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LOG LIST */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {loading ? (
              <div className="py-20 text-center text-muted-foreground animate-pulse">
                กำลังโหลดข้อมูล...
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                ไม่พบประวัติการใช้งาน
              </div>
            ) : (
              paginatedLogs.map((log, i) => (
                <LogItem key={log._id} log={log} idx={i} onSelect={() => {}} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* PAGINATION CONTROLS */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          หน้า {page} / {totalPages || 1}
        </span>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ก่อนหน้า
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            ถัดไป
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
