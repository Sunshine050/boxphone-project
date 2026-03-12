"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DevicesService } from "@/services/devices.service";
import type { OverviewStatus } from "@/lib/device-status";

/* ================= TYPES ================= */

export type DeviceStatus = OverviewStatus;

export type StatusFilter = DeviceStatus | "all";

export interface OverviewDevice {
  id: string;
  name: string;
  serial_number?: string;
  status: DeviceStatus;
  user?: string;
}

interface OverviewPhoneGridProps {
  query: string;
  userMap?: Record<string, string>;
  statusFilter: StatusFilter;
  devices: OverviewDevice[];
  /** เมื่อส่งมา จะแสดงปุ่มมอบหมาย — เครื่องที่ไม่พร้อมใช้งานจะกดไม่ได้ และแสดงสถานะชัดเจน */
  onAssign?: (device: OverviewDevice) => void;
}

/* ================= COMPONENT ================= */

const STATUS_LABELS: Record<DeviceStatus, string> = {
  "in-use": "กำลังใช้งาน",
  available: "พร้อมใช้งาน",
  error: "ออฟไลน์/ผิดพลาด",
  maintenance: "แจ้งซ่อม/ชำรุด",
};

export function OverviewPhoneGrid({
  query,
  statusFilter,
  userMap = {},
  devices,
  onAssign,
}: OverviewPhoneGridProps) {
  const filteredDevices = devices.filter((d) => {
    const userName = d.user ? (userMap[d.user] || "").toLowerCase() : "";
    const matchQuery =
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      userName.includes(query.toLowerCase()) ||
      (d.user || "").toLowerCase().includes(query.toLowerCase());

    const matchStatus = statusFilter === "all" || d.status === statusFilter;

    return matchQuery && matchStatus;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
      {filteredDevices.length === 0 && (
        <div className="col-span-full text-center text-sm text-muted-foreground py-10">
          ยังไม่มีข้อมูลอุปกรณ์
        </div>
      )}

      {filteredDevices.map((d, index) => {
        const canAssign = d.status === "available";
        const showAssign = !!onAssign;

        return (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            whileHover={canAssign || !showAssign ? { y: -4 } : undefined}
            className={`
              rounded-2xl
              border border-border/70
              bg-card
              overflow-hidden
              shadow-sm
              transition-all
              ${showAssign && !canAssign ? "opacity-80" : ""}
              ${canAssign && showAssign ? "hover:shadow-lg" : showAssign ? "cursor-not-allowed" : "hover:shadow-lg"}
            `}
          >
            {/* ================= PHONE SCREEN ================= */}
            <div
              className="
                relative
                aspect-[9/16]
                bg-gradient-to-b from-neutral-900 to-black
                flex items-center justify-center
                text-muted-foreground text-xs
                ring-1 ring-inset ring-white/10
                overflow-hidden
              "
            >
              <div className="absolute top-2 right-2 z-10">
                <StatusBadge status={d.status} />
              </div>
              <DeviceScreenshot deviceId={d.id} status={d.status} />
            </div>

            {/* ================= INFO + STATUS ================= */}
            <div className="p-4 space-y-2">
              <p className="text-sm font-semibold truncate">{d.name}</p>

              {/* แจ้ง status ชัดเจน (โดยเฉพาะเมื่อมีปุ่มมอบหมาย) */}
              {showAssign && (
                <p
                  className={`text-xs ${canAssign ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
                  title={canAssign ? "พร้อมมอบหมาย" : `ไม่พร้อมมอบหมาย - ${STATUS_LABELS[d.status]}`}
                >
                  สถานะ: {STATUS_LABELS[d.status]}
                  {!canAssign && (
                    <span className="block text-[10px] mt-0.5 text-amber-600 dark:text-amber-400">
                      ไม่สามารถมอบหมายได้
                    </span>
                  )}
                </p>
              )}

              {d.user ? (
                <p className="text-xs text-foreground font-medium truncate flex items-center gap-1">
                  <span className="text-muted-foreground font-normal">ผู้ใช้:</span>
                  {userMap[d.user] || `ID: ${d.user.slice(-4)}`}
                </p>
              ) : !showAssign ? (
                <p className="text-xs text-muted-foreground italic">ไม่มีผู้ใช้งาน</p>
              ) : null}

              {showAssign && (
                <Button
                  size="sm"
                  variant={canAssign ? "default" : "secondary"}
                  className="w-full mt-2"
                  disabled={!canAssign}
                  onClick={() => canAssign && onAssign(d)}
                  title={canAssign ? "มอบหมายเครื่องนี้" : `เฉพาะเครื่องที่พร้อมใช้งาน (สถานะ: ${STATUS_LABELS[d.status]})`}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  {canAssign ? "มอบหมาย" : "ไม่พร้อมมอบหมาย"}
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ================= DEVICE SCREENSHOT ================= */

function DeviceScreenshot({ deviceId, status }: { deviceId: string; status: DeviceStatus }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // โหลด screenshot เฉพาะเมื่อการ์ดอยู่ใน viewport — หน้าภาพรวมโหลดเร็วขึ้น
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => setIsInView(e.isIntersecting));
      },
      { rootMargin: "100px", threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fetchScreenshot = async () => {
    if (status === "maintenance" || status === "error") {
      return; // ไม่ดึงหน้าจอถ้าเครื่องไม่พร้อม
    }

    setLoading(true);
    setError(false);
    setErrorMessage("");

    try {
      const url = DevicesService.getScreenshotUrl(deviceId);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        let msg = errorText || response.statusText;
        try {
          const j = JSON.parse(errorText);
          if (j.message) msg = j.message;
        } catch {
          if (errorText.length > 200) msg = errorText.slice(0, 200) + "...";
        }
        throw new Error(msg);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (imageUrl && imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }

      setImageUrl(blobUrl);
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to fetch screenshot:", err);
      setError(true);
      setErrorMessage(err.message || "ไม่สามารถดึงหน้าจอได้");
      setLoading(false);
      // หยุด auto-refresh เมื่อดึงไม่ได้ — ลดการกระพริบ
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!isInView) return;
    fetchScreenshot();
    const refreshMs = Math.max(
      500,
      Number(process.env.NEXT_PUBLIC_SCREENSHOT_REFRESH_MS) || 5000
    );
    intervalRef.current = setInterval(fetchScreenshot, refreshMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (imageUrl && imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [deviceId, status, isInView]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-0 relative flex items-center justify-center">
      {status === "maintenance" || status === "error" ? (
        <p className="text-xs text-muted-foreground">ไม่สามารถดึงหน้าจอได้</p>
      ) : !isInView ? (
        <p className="text-xs text-muted-foreground">เลื่อนเพื่อโหลด</p>
      ) : loading && !imageUrl ? (
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : error || !imageUrl ? (
        <div className="flex flex-col items-center justify-center gap-2 p-2">
          <p className="text-xs text-muted-foreground text-center">
            {errorMessage || "ไม่สามารถดึงหน้าจอได้"}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={fetchScreenshot}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            รีเฟรช
          </Button>
        </div>
      ) : (
        <>
          <img
            src={imageUrl}
            alt={`Device ${deviceId} screenshot`}
            className="w-full h-full object-contain"
            onError={() => setError(true)}
          />
          <div className="absolute bottom-2 right-2 z-10">
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 opacity-80 hover:opacity-100"
              onClick={fetchScreenshot}
              title="รีเฟรชหน้าจอ"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= STATUS BADGE ================= */

function StatusBadge({ status }: { status: DeviceStatus }) {
  const map: Record<DeviceStatus, { label: string; className: string }> = {
    "in-use": {
      label: "กำลังใช้งาน",
      className: "border-2 border-red-500/60 bg-red-500/10 text-red-500",
    },
    available: {
      label: "พร้อมใช้งาน",
      className: "border-2 border-green-500/60 bg-green-500/10 text-green-500",
    },
    error: {
      label: "ออฟไลน์/ผิดพลาด",
      className: "border-2 border-yellow-500/60 bg-yellow-500/10 text-yellow-500",
    },
    maintenance: {
      label: "แจ้งซ่อม/ชำรุด",
      className: "border-2 border-amber-500/60 bg-amber-500/10 text-amber-500",
    },
  };

  const s = map[status];

  return (
    <Badge
      className={`
        rounded-full
        px-3 py-0.5
        text-[11px]
        font-medium
        backdrop-blur
        ${s?.className ?? "bg-muted text-muted-foreground"}
      `}
    >
      {s?.label ?? status}
    </Badge>
  );
}
