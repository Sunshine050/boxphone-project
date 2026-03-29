"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AvailableDevicesGrid } from "@/components/available-devices-grid";
import { DevicesService } from "@/services/devices.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, RefreshCw } from "lucide-react";
import { normalizeDeviceStatus, type DeviceStatusUI } from "@/lib/device-status";
import { HelpButton } from "@/components/help/help-button";

import useSWR from "swr";

export type AvailableDevice = {
  id: string;
  name: string;
  serial_number: string;
  status: DeviceStatusUI;
  model?: string;
  sdk_version?: number;
};

export default function AvailableDevicesPage() {
  const [selected, setSelected] = useState<AvailableDevice | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = (await DevicesService.getAll()) as any[];

      const mapped: AvailableDevice[] = data.map((d) => ({
        id: d.id || d._id,
        name: d.name,
        serial_number: d.serial_number,
        status: normalizeDeviceStatus(d.status),
        model: d.model,
        sdk_version: d.sdk_version,
      }));

      setDevices(mapped);
    } catch (err: any) {
      alert(err.message || "โหลดรายการอุปกรณ์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const [syncing, setSyncing] = useState(false);

  // ✅ เอาเฉพาะเครื่องที่พร้อมใช้งาน
  const [devices, setDevices] = useState<AvailableDevice[]>([]);
  const [loading, setLoading] = useState(false);

  const availableDevices = useMemo(() => {
    return devices.filter((d: AvailableDevice) => d.status === "AVAILABLE");
  }, [devices]);

  const handleSyncFromXiaowei = async () => {
    setSyncing(true);
    try {
      const result = await DevicesService.syncFromXiaowei();
      alert(`Sync สำเร็จ! พบ ${result.total} เครื่อง, Sync แล้ว ${result.synced} เครื่อง`);
      await fetchDevices();
    } catch (error: any) {
      alert(`Sync ไม่สำเร็จ: ${error.message}\n\nตรวจสอบว่า:\n- แอปเสี่ยวเหว๋ยเปิดอยู่ และเปิด API แล้ว\n- Backend ตั้ง XIAOWEI_WS_URL ใน .env ให้ตรงกับ port จริง (ตรวจจาก netstat)`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-semibold">อุปกรณ์ที่พร้อมใช้งาน</h1>
            <HelpButton topic="available" />
          </div>
          <p className="text-muted-foreground mt-1">
            จัดการอุปกรณ์ที่ว่าง ตรวจสอบสถานะ และมอบหมายให้ผู้ใช้งาน
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleSyncFromXiaowei}
          disabled={syncing || loading}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "กำลัง Sync..." : "Sync จากเสี่ยวเหว๋ย"}
        </Button>
      </div>

      {/* ถ้ายังไม่มีอุปกรณ์ในระบบเลย แสดงคำอธิบาย + ปุ่ม Sync (ไม่แสดง grid) */}
      {!loading && devices.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/30 bg-muted/20">
          <CardContent className="py-10 px-6 text-center space-y-4">
            <Smartphone className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              ยังไม่มีอุปกรณ์ในระบบ — ต้องดึงรายการเครื่องจากเสี่ยวเหว๋ยเข้ามาก่อน ถึงจะดูภาพหน้าจอและมอบหมายเครื่องได้
            </p>
            <p className="text-sm text-muted-foreground">
              ตรวจสอบว่าแอปเสี่ยวเหว๋ยเปิดอยู่ และเปิด API (ปุ่ม API / WebSocket) แล้ว
            </p>
            <Button onClick={handleSyncFromXiaowei} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "กำลัง Sync..." : "Sync จากเสี่ยวเหว๋ย"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AvailableDevicesGrid
          loading={loading}
          devices={availableDevices}
          selected={selected}
          onSelect={(device) => setSelected(device)}
          onCloseDialog={() => setSelected(null)}
          onSuccess={fetchDevices}
        />
      )}
    </motion.div>
  );
}
function setLoading(arg0: boolean) {
  throw new Error("Function not implemented.");
}

