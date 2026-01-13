"use client";

import { useState } from "react";
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

export default function DeviceManagementPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<Device | null>(null);

  // 👁️ View dialog
  const [viewDevice, setViewDevice] = useState<Device | null>(null);
  const [devices] = useState<Device[]>([]); // TODO: will be filled from API later

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
          className=" cursor-pointer"
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

      {/* Table */}
      <DeviceManagementTable
        devices={devices}
        onView={(device) => {
          setViewDevice(device);
        }}
        onEdit={(device) => {
          setMode("edit");
          setSelected(device);
          setDialogOpen(true);
        }}
      />

      {/* Create / Edit Dialog */}
      <DeviceFormDialog
        open={dialogOpen}
        mode={mode}
        device={selected}
        onClose={() => setDialogOpen(false)}
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
                <strong>Serial:</strong> {viewDevice.serialNumber}
              </div>
              <div>
                <strong>สถานะ:</strong>{" "}
                {viewDevice.status === "available"
                  ? "พร้อมใช้งาน"
                  : "กำลังใช้งาน"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
