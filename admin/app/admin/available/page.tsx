"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AvailableDevicesGrid } from "@/components/available-devices-grid";
import { DevicesService } from "@/services/devices.service";

export type AvailableDevice = {
  id: string;
  name: string;
  serial_number: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  model?: string;
  sdk_version?: number;
};

export default function AvailableDevicesPage() {
  const [devices, setDevices] = useState<AvailableDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<AvailableDevice | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = (await DevicesService.getAll()) as any[];

      const mapped: AvailableDevice[] = data.map((d) => ({
        id: d.id || d._id,
        name: d.name,
        serial_number: d.serial_number,
        status: d.status,
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

  // ✅ เอาเฉพาะเครื่องที่พร้อมใช้งาน
  const availableDevices = useMemo(() => {
    return devices.filter((d) => d.status === "AVAILABLE");
  }, [devices]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      <div>
        <h1 className="text-3xl font-semibold mb-2">อุปกรณ์ที่พร้อมใช้งาน</h1>
        <p className="text-muted-foreground">
          จัดการอุปกรณ์ที่ว่าง ตรวจสอบสถานะ และมอบหมายให้ผู้ใช้งาน
        </p>
      </div>

      <AvailableDevicesGrid
        loading={loading}
        devices={availableDevices}
        selected={selected}
        onSelect={(device) => setSelected(device)}
        onCloseDialog={() => setSelected(null)}
        onSuccess={fetchDevices}
      />
    </motion.div>
  );
}
