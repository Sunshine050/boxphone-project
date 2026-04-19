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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DevicesService } from "@/services/devices.service";
import { UsersService } from "@/services/users.service";
import { normalizeDeviceStatus } from "@/lib/device-status";
import { HelpButton } from "@/components/help/help-button";
import { useToast } from "@/hooks/use-toast";

export default function DeviceManagementPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Device | null>(null);

  // 👁️ View dialog
  const [viewDevice, setViewDevice] = useState<Device | null>(null);

  // 🗑️ Delete confirm dialog
  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null);

  // 🔧 Mark status confirm
  const [markTarget, setMarkTarget] = useState<{
    device: Device;
    status: "UNDER_REPAIR" | "DAMAGED" | "AVAILABLE" | "QUARANTINE";
  } | null>(null);

  // ✅ API devices
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const userMap = useMemo(() => {
    return users.reduce(
      (acc, u) => {
        acc[u.id || u._id] = u.name;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [users]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const [deviceData, userData] = await Promise.all([
        DevicesService.getAll(),
        UsersService.getAll(),
      ]);

      const mapped: Device[] = deviceData.map((d: any) => ({
        id: d.id || d._id,
        name: d.name,
        serial_number: d.serial_number,
        status: normalizeDeviceStatus(d.status),
        current_user_id: d.current_user_id ?? null,
        previous_user_id: d.previous_user_id ?? null,
        last_user_disconnected_at: d.last_user_disconnected_at ?? null,
      }));

      setDevices(mapped);
      setUsers(userData);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "โหลดข้อมูลไม่สำเร็จ",
        description: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteDevice) return;
    try {
      await DevicesService.delete(deleteDevice.id);
      toast({ title: "ลบอุปกรณ์แล้ว", description: deleteDevice.name });
      await fetchDevices();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "ลบไม่สำเร็จ",
        description: err?.message || "เกิดข้อผิดพลาด",
      });
    } finally {
      setDeleteDevice(null);
    }
  };

  const handleMarkConfirm = async () => {
    if (!markTarget) return;
    const { device, status } = markTarget;
    const labels: Record<string, string> = {
      UNDER_REPAIR: "แจ้งซ่อม",
      DAMAGED: "ชำรุด",
      AVAILABLE: "พร้อมใช้งาน",
      QUARANTINE: "รอล้างข้อมูล",
    };
    try {
      await DevicesService.markStatus(device.id, status);
      toast({
        title: `ตั้งค่าสำเร็จ`,
        description: `${device.name} → ${labels[status]}`,
      });
      await fetchDevices();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "ตั้งค่าไม่สำเร็จ",
        description: err?.message || "เกิดข้อผิดพลาด",
      });
    } finally {
      setMarkTarget(null);
    }
  };

  const handleDeleteDevice = (device: Device) => {
    setDeleteDevice(device);
  };

  const handleMarkStatus = (
    device: Device,
    status: "UNDER_REPAIR" | "DAMAGED" | "AVAILABLE" | "QUARANTINE",
  ) => {
    setMarkTarget({ device, status });
  };

  const markLabels: Record<string, string> = {
    UNDER_REPAIR: "แจ้งซ่อม",
    DAMAGED: "ชำรุด",
    AVAILABLE: "พร้อมใช้งาน",
    QUARANTINE: "รอล้างข้อมูล",
  };

  const previousUserName = markTarget?.device.previous_user_id
    ? userMap[markTarget.device.previous_user_id] ||
      `...${markTarget.device.previous_user_id.slice(-4)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-semibold">จัดการอุปกรณ์</h1>
            <HelpButton topic="devices" />
          </div>
          <p className="text-muted-foreground mt-1">
            ลงทะเบียนและจัดการอุปกรณ์จริง
          </p>
        </div>

        <Button
          className="cursor-pointer shrink-0"
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
          onMarkStatus={handleMarkStatus}
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

      {/* Delete Confirm Dialog */}
      <AlertDialog
        open={!!deleteDevice}
        onOpenChange={(o) => !o && setDeleteDevice(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบอุปกรณ์</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบอุปกรณ์{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteDevice?.name}&quot;
              </span>{" "}
              จริงไหม? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Status Confirm Dialog */}
      <AlertDialog
        open={!!markTarget}
        onOpenChange={(o) => !o && setMarkTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ตั้งค่าอุปกรณ์เป็น &quot;
              {markTarget ? markLabels[markTarget.status] : ""}&quot;
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  อุปกรณ์:{" "}
                  <span className="font-semibold text-foreground">
                    {markTarget?.device.name}
                  </span>
                </p>
                {markTarget?.status === "AVAILABLE" && previousUserName && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600 text-xs space-y-1">
                    <p className="font-medium">
                      ⚠️ ผู้ใช้ล่าสุด: {previousUserName}
                    </p>
                    <p>กรุณาตรวจสอบว่าได้ดำเนินการดังนี้แล้ว:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      <li>ลบอีเมลและบัญชีของลูกค้าออกจากเครื่องแล้ว</li>
                      <li>ลบเกมและแอปที่ลูกค้าติดตั้งออกแล้ว</li>
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkConfirm}>
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <strong>ผู้ใช้งานปัจจุบัน:</strong>{" "}
                {viewDevice.current_user_id
                  ? userMap[viewDevice.current_user_id] || "ไม่พบชื่อ"
                  : "-"}
              </div>
              {viewDevice.previous_user_id && (
                <div>
                  <strong>ผู้ใช้ล่าสุด:</strong>{" "}
                  <span className="text-amber-600 font-medium">
                    {userMap[viewDevice.previous_user_id] ||
                      `User: ${viewDevice.previous_user_id.slice(-4)}`}
                  </span>
                  {viewDevice.last_user_disconnected_at && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      (
                      {new Date(
                        viewDevice.last_user_disconnected_at,
                      ).toLocaleString("th-TH")}
                      )
                    </span>
                  )}
                </div>
              )}
              {(viewDevice.status === "UNDER_REPAIR" ||
                viewDevice.status === "DAMAGED" ||
                viewDevice.status === "QUARANTINE") &&
                viewDevice.previous_user_id && (
                  <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-3 text-orange-700 text-xs mt-2">
                    ⚠️ กรุณาลบข้อมูลลูกค้า (อีเมล, เกม, แอป) ออกจากเครื่องก่อนกด
                    &quot;พร้อมใช้งาน&quot;
                  </div>
                )}
              {viewDevice.status === "QUARANTINE" &&
                !viewDevice.previous_user_id && (
                  <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-3 text-orange-700 text-xs mt-2">
                    ⚠️ เครื่องอยู่ในสถานะรอล้างข้อมูล กรุณาตรวจสอบก่อนกด
                    &quot;พร้อมใช้งาน&quot;
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
