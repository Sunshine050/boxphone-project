"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, RotateCw } from "lucide-react";
import { AdminLog, LogType } from "@/types/log";
import { LogItem } from "@/components/logs/log-item";
import { apiFetch } from "@/services/api";

const PAGE_SIZE = 10;

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<LogType | "all">("all");
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);

  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const data = await apiFetch<AdminLog[]>("/admin-logs");

      setLogs(data);
    } catch (err: any) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const q = query.toLowerCase();
      const matchText =
        l.message.toLowerCase().includes(q) ||
        l.target_user_id?.username?.toLowerCase().includes(q) ||
        l.target_device_id?.name?.toLowerCase().includes(q);

      const matchType = typeFilter === "all" || l.type === typeFilter;
      return matchText && matchType;
    });
  }, [logs, query, typeFilter]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, page]);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Activity Logs</h1>
          <p className="text-xs text-muted-foreground">
            บันทึกเหตุการณ์และการทำงานของระบบทั้งหมด
          </p>
        </div>

        <Button onClick={fetchLogs} disabled={loading} size="sm" variant="outline" className="gap-2">
          <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      {/* FILTER BAR */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาข้อความ, ชื่อผู้ใช้, หรือชื่อเครื่อง..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            className="flex h-9 w-full sm:w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">ทุกประเภทเหตุการณ์</option>
            <option value="USER_CREATED">เพิ่มผู้ใช้</option>
            <option value="TIME_ADDED">เติมเวลา</option>
            <option value="DEVICE_ASSIGNED">มอบหมายเครื่อง</option>
            <option value="DEVICE_DISCONNECTED">ตัดการเชื่อมต่อ</option>
          </select>
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
                <LogItem key={log._id} log={log} idx={i} onSelect={setSelectedLog} />
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