"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { AssignUserDialog } from "./assign-user-dialog";
import { AvailableDevice } from "@/app/admin/available/page";
import { useState, useEffect, useRef } from "react";
import { DevicesService } from "@/services/devices.service";

interface Props {
  loading: boolean;
  devices: AvailableDevice[];
  selected: AvailableDevice | null;
  onSelect: (device: AvailableDevice) => void;
  onCloseDialog: () => void;
  onSuccess?: () => void;
}

export function AvailableDevicesGrid({
  loading,
  devices,
  selected,
  onSelect,
  onCloseDialog,
  onSuccess,
}: Props) {
  if (loading) {
    return <div className="text-muted-foreground">กำลังโหลดอุปกรณ์...</div>;
  }

  if (devices.length === 0) {
    return (
      <div className="text-muted-foreground">
        ยังไม่มีอุปกรณ์ที่พร้อมใช้งาน (AVAILABLE)
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          show: { transition: { staggerChildren: 0.06 } },
        }}
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {devices.map((device) => (
          <motion.div
            key={device.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0 },
            }}
          >
            <Card className="bg-card border-border/70 transition hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <h3 className="font-mono text-sm font-medium">
                        {device.name}
                      </h3>
                      <span className="text-xs text-muted-foreground font-mono">
                        SN: {device.serial_number}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                    พร้อมใช้งาน
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="relative aspect-[9/16] bg-gradient-to-b from-neutral-900 to-black rounded-lg overflow-hidden ring-1 ring-inset ring-white/10">
                  <DeviceScreenshot
                    deviceId={device.id}
                    serialNumber={device.serial_number}
                  />
                </div>

                <div className="text-xs">
                  <p className="text-muted-foreground">ข้อมูลเครื่อง</p>
                  <p className="font-medium">
                    {device.model ? device.model : "-"}{" "}
                    {device.sdk_version ? `(SDK ${device.sdk_version})` : ""}
                  </p>
                </div>

                <Button
                  className="w-full cursor-pointer"
                  onClick={() => onSelect(device)}
                >
                  มอบหมายผู้ใช้งาน
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {selected && (
        <AssignUserDialog
          device={selected}
          onClose={onCloseDialog}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}

/* ================= DEVICE SCREENSHOT ================= */

function DeviceScreenshot({
  deviceId,
  serialNumber,
}: {
  deviceId: string;
  serialNumber: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchScreenshot = async () => {
    setLoading(true);
    setError(false);
    setErrorMessage("");

    try {
      const url = DevicesService.getScreenshotUrlBySerial(serialNumber);
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  useEffect(() => {
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
  }, [deviceId, serialNumber]);

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
        alt={`Device ${serialNumber} screenshot`}
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
  );
}
