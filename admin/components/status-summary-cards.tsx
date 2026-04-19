"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { DevicesService } from "@/services/devices.service";
import {
  normalizeDeviceStatus,
  type DeviceStatusUI,
} from "@/lib/device-status";

/* ================= TYPES ================= */

interface StatusItem {
  label: string;
  count: number;
  variant: "inUse" | "available" | "error" | "maintenance";
}

interface BackendDevice {
  _id: string;
  name: string;
  serial_number: string;
  status: DeviceStatusUI;
  model?: string;
  sdk_version?: number;
  current_user_id?: string;
  last_connected_at?: string;
}

/* ================= STYLE MAP ================= */

const accentMap: Record<StatusItem["variant"], string> = {
  inUse: "from-red-500/30",
  available: "from-green-500/30",
  error: "from-yellow-500/30",
  maintenance: "from-muted/40",
};

/* ================= COMPONENT ================= */

export function StatusSummaryCards() {
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const data = (await DevicesService.getAll()) as any[];
        const normalized = (data || []).map((d: any) => ({
          ...d,
          _id: d._id || d.id,
          status: normalizeDeviceStatus(d.status),
        })) as BackendDevice[];
        setDevices(normalized);
      } catch (error) {
        console.error("Failed to fetch devices:", error);
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const countByStatus = useMemo(() => {
    return {
      inUse: devices.filter((d) => d.status === "BUSY").length,
      available: devices.filter((d) => d.status === "AVAILABLE").length,
      error: devices.filter((d) => d.status === "OFFLINE").length,
      maintenance: devices.filter(
        (d) =>
          d.status === "UNDER_REPAIR" ||
          d.status === "DAMAGED" ||
          d.status === "QUARANTINE",
      ).length,
    };
  }, [devices]);

  const items: StatusItem[] = [
    { label: "กำลังใช้งาน", count: countByStatus.inUse, variant: "inUse" },
    {
      label: "พร้อมใช้งาน",
      count: countByStatus.available,
      variant: "available",
    },
    { label: "เกิดข้อผิดพลาด", count: countByStatus.error, variant: "error" },
    {
      label: "อยู่ระหว่างซ่อมบำรุง",
      count: countByStatus.maintenance,
      variant: "maintenance",
    },
  ];

  if (loading) {
    return (
      <div
        className="
          grid gap-4
          grid-cols-2
          md:grid-cols-4
          items-stretch
        "
      >
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card border-border/70 h-full">
            <CardContent className="p-5 h-full min-h-[104px] flex items-center">
              <div className="animate-pulse w-full">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div
      className="
        grid gap-4
        grid-cols-2
        md:grid-cols-4
        items-stretch
      "
    >
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="h-full"
        >
          <Card
            className="
              relative overflow-hidden
              bg-card border-border/70
              ring-1 ring-border/40
              transition
              hover:ring-border
              h-full
            "
          >
            {/* Accent gradient */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-r to-transparent",
                accentMap[item.variant],
              )}
            />

            <CardContent
              className="
                relative
                p-4 sm:p-5
                h-full min-h-[104px]
                flex items-center justify-between gap-3
              "
            >
              {/* Left */}
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                  {item.label}
                </p>

                <p className="text-2xl sm:text-3xl font-semibold tracking-tight leading-none">
                  {item.count}
                </p>
              </div>

              {/* Right */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Badge
                  variant={item.variant as any}
                  className="max-w-[140px] truncate whitespace-nowrap"
                  title={item.label}
                >
                  {item.label}
                </Badge>

                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
