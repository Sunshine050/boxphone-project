"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Eye, Power, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DevicesService } from "@/services/devices.service";

/* ================= TYPES ================= */

export type DeviceStatus = "in-use" | "available" | "error" | "maintenance";

export type StatusFilter = DeviceStatus | "all";

export interface OverviewDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  user?: string;
}

interface OverviewPhoneGridProps {
  query: string;
  userMap: Record<string, string>;
  statusFilter: StatusFilter;
  devices: OverviewDevice[];
}

/* ================= COMPONENT ================= */

export function OverviewPhoneGrid({
  query,
  statusFilter,
  userMap,
  devices,
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

      {filteredDevices.map((d, index) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          whileHover={{ y: -4 }}
          className="
            rounded-2xl
            border border-border/70
            bg-card
            overflow-hidden
            shadow-sm
            transition-all
            hover:shadow-lg
          "
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
            {/* ✅ STATUS BADGE (อยู่บนจอโทรศัพท์) */}
            <div className="absolute top-2 right-2 z-10">
              <StatusBadge status={d.status} />
            </div>

            {/* ✅ ภาพหน้าจอจากเสี่ยวเหว๋ย */}
            <DeviceScreenshot deviceId={d.id} status={d.status} />
          </div>

          {/* ================= INFO ================= */}
          <div className="p-4 space-y-2">
            <p className="text-sm font-semibold truncate">{d.name}</p>

            {d.user ? (
              <p className="text-xs text-foreground font-medium truncate flex items-center gap-1">
                <span className="text-muted-foreground font-normal">ผู้ใช้:</span>
                {/* 🎯 แสดงชื่อจาก Map ถ้าหาไม่เจอให้แสดง ID 4 ตัวท้าย */}
                {userMap[d.user] || `ID: ${d.user.slice(-4)}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                ไม่มีผู้ใช้งาน
              </p>
            )}

            <div className="flex items-center justify-end gap-1 pt-2">
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Eye className="w-4 h-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={d.status === "maintenance"}
              >
                <Power className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ================= DEVICE SCREENSHOT ================= */

function DeviceScreenshot({ deviceId, status }: { deviceId: string; status: DeviceStatus }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const fetchScreenshot = async () => {
    if (status === "maintenance" || status === "error") {
      return; // ไม่ดึงหน้าจอถ้าเครื่องไม่พร้อม
    }

    setLoading(true);
    setError(false);
    setErrorMessage("");

    try {
      // สร้าง URL พร้อม timestamp เพื่อ bypass cache
      const url = DevicesService.getScreenshotUrl(deviceId);

      // ดึง token จาก localStorage
      const token = typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

      // ใช้ fetch เพื่อส่ง Authorization header
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      // สร้าง blob URL จาก response
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // ลบ blob URL เก่า (ถ้ามี)
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
    }
  };

  useEffect(() => {
    fetchScreenshot();
    // Auto-refresh ทุก 5 วินาที (optional - สามารถปิดได้)
    const interval = setInterval(fetchScreenshot, 5000);
    return () => {
      clearInterval(interval);
      // Cleanup blob URL เมื่อ component unmount
      if (imageUrl && imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [deviceId, status]);

  if (status === "maintenance" || status === "error") {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-xs text-muted-foreground">ไม่สามารถดึงหน้าจอได้</p>
      </div>
    );
  }

  if (loading && !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
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
    );
  }

  return (
    <>
      <img
        src={imageUrl}
        alt={`Device ${deviceId} screenshot`}
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
      {/* ปุ่ม refresh แบบ manual */}
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
      label: "ผิดพลาด",
      className:
        "border-2 border-yellow-500/60 bg-yellow-500/10 text-yellow-400",
    },
    maintenance: {
      label: "ซ่อมบำรุง",
      className: "border-2 border-border bg-muted text-muted-foreground",
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
        ${s.className}
      `}
    >
      {s.label}
    </Badge>
  );
}
