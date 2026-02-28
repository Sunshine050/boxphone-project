"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DeviceManagementTable,
  Device,
} from "@/components/device/device-management-table";
import { DeviceFormDialog } from "@/components/device/device-form-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DevicesService } from "@/services/devices.service";
import { UsersService } from "@/services/users.service";

export default function DeviceManagementPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Device | null>(null);

  // 👁️ View dialog
  const [viewDevice, setViewDevice] = useState<Device | null>(null);

  // ✅ API devices
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const userMap = useMemo(() => {
    return users.reduce((acc, u) => {
      acc[u.id || u._id] = u.name;
      return acc;
    }, {} as Record<string, string>);
  }, [users]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      // 🎯 ดึงทั้ง Devices และ Users พร้อมกัน
      const [deviceData, userData] = await Promise.all([
        DevicesService.getAll(),
        UsersService.getAll()
      ]);

      const mapped: Device[] = deviceData.map((d: any) => {
        const raw = String(d.status || "").trim().toUpperCase();

        let normalized: Device["status"];

        if (raw === "AVAILABLE") normalized = "AVAILABLE";
        else if (raw === "BUSY" || raw === "INUSE" || raw === "ACTIVE") normalized = "BUSY";
        else if (raw === "OFFLINE") normalized = "OFFLINE";
        else normalized = "AVAILABLE";

        return {
          id: d.id || d._id,
          name: d.name,
          serial_number: d.serial_number,
          status: normalized,
          current_user_id: d.current_user_id ?? null,
        };
      });

      setDevices(mapped);
      setUsers(userData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // ✅ ย้าย logic มาไว้ตรงนี้แทน
  const handleDeleteDevice = async (device: Device) => {
    const ok = confirm(`ต้องการลบอุปกรณ์ "${device.name}" จริงไหม?`);
    if (!ok) return;

    await DevicesService.delete(device.id);
    await fetchDevices();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">จัดการอุปกรณ์</h1>
          <p className="text-muted-foreground">ลงทะเบียนและจัดการอุปกรณ์จริง</p>
        </div>

        {/* CREATE */}
        <Button
          className="cursor-pointer"
          onClick={() => {
            setMode("create");
            setSelected(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มอุปกรณ์ใหม่
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-muted-foreground">กำลังโหลดอุปกรณ์...</div>
      ) : (
        <DeviceManagementTable
          devices={devices}
          userMap={userMap}
          onView={(device) => setViewDevice(device)}
          onEdit={(device) => {
            setMode("edit");
            setSelected(device);
            setDialogOpen(true);
          }}
          onDelete={handleDeleteDevice}
        />
      )}

      {/* Create / Edit Dialog */}
      <DeviceFormDialog
        open={dialogOpen}
        mode={mode}
        device={selected}
        onClose={() => setDialogOpen(false)}
        onSuccess={fetchDevices}
      />

      {/* View Dialog */}
      <Dialog open={!!viewDevice} onOpenChange={() => setViewDevice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รายละเอียดอุปกรณ์</DialogTitle>
          </DialogHeader>

          {viewDevice && (
            <div className="space-y-2 text-sm">
              <div>
                <strong>ชื่ออุปกรณ์:</strong> {viewDevice.name}
              </div>
              <div>
                <strong>Serial:</strong> {viewDevice.serial_number}
              </div>
              <div>
                <strong>สถานะ:</strong> {viewDevice.status}
              </div>
              <div>
                <strong>ผู้ใช้งาน:</strong>{" "}
                {viewDevice.current_user_id ? (userMap[viewDevice.current_user_id] || "ไม่พบชื่อ") : "-"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
