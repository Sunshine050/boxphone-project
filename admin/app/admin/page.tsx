"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  OverviewPhoneGrid,
  type OverviewDevice,
} from "@/components/overview-phone-grid";
import { StatusSummaryCards } from "@/components/status-summary-cards";
import { Button } from "@/components/ui/button";
import { DevicesService } from "@/services/devices.service";

export type DeviceStatus =
  | "all"
  | "in-use"
  | "available"
  | "error"
  | "maintenance";

/** ✅ map backend status -> overview status */
function mapDeviceStatus(status: string): Exclude<DeviceStatus, "all"> {
  if (status === "AVAILABLE") return "available";
  if (status === "BUSY") return "in-use";
  if (status === "OFFLINE") return "maintenance";
  return "error";
}

export default function AdminOverviewPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus>("all");

  const [devices, setDevices] = useState<OverviewDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await DevicesService.getAll(); // ✅ GET /devices

      const mapped: OverviewDevice[] = (data || []).map((d: any) => ({
        id: d.id || d._id,
        name: d.name,
        status: mapDeviceStatus(d.status),
        user: d.current_user_id ?? undefined,
      }));

      setDevices(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  /** ✅ Summary counts (ส่งให้ cards ได้ ถ้าอยากใช้ต่อ) */
  const summary = useMemo(() => {
    const total = devices.length;
    const available = devices.filter((d) => d.status === "available").length;
    const inUse = devices.filter((d) => d.status === "in-use").length;
    const maintenance = devices.filter((d) => d.status === "maintenance").length;
    const error = devices.filter((d) => d.status === "error").length;

    return { total, available, inUse, maintenance, error };
  }, [devices]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-1">ภาพรวมระบบ</h1>
          <p className="text-sm text-muted-foreground">
            สถานะเครื่อง Android แบบเรียลไทม์
          </p>
        </div>

        {/* ✅ refresh button */}
        <Button
          variant="outline"
          onClick={fetchDevices}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? "กำลังโหลด..." : "รีเฟรช"}
        </Button>
      </div>

      {/* สรุปสถานะ */}
      <StatusSummaryCards />
      {/* ถ้าคุณอยากให้ cards ใช้ summary จริง เดี๋ยวผมแก้ component ให้รับ props ได้ */}

      {/* ตัวกรอง */}
      <div className="flex flex-wrap items-center gap-3">
        {/* ค้นหา */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อเครื่อง / ผู้ใช้"
            className="pl-10"
          />
        </div>

        {/* กรองตามสถานะ */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: `ทั้งหมด (${summary.total})` },
            { key: "in-use", label: `กำลังใช้งาน (${summary.inUse})` },
            { key: "available", label: `ว่าง (${summary.available})` },
            { key: "error", label: `ผิดพลาด (${summary.error})` },
            { key: "maintenance", label: `ซ่อมบำรุง (${summary.maintenance})` },
          ].map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={statusFilter === s.key ? "default" : "outline"}
              onClick={() => setStatusFilter(s.key as DeviceStatus)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-muted-foreground text-sm">กำลังโหลดข้อมูล...</div>
      ) : (
        <OverviewPhoneGrid
          query={query}
          statusFilter={statusFilter}
          devices={devices}
        />
      )}
    </motion.div>
  );
}
