"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Device } from "./device-management-table"

interface DeviceFormDialogProps {
  open: boolean
  mode: "create" | "edit"
  device?: Device | null
  onClose: () => void
}

export function DeviceFormDialog({
  open,
  mode,
  device,
  onClose,
}: DeviceFormDialogProps) {
  const isEdit = mode === "edit"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="ชื่ออุปกรณ์"
            defaultValue={isEdit ? device?.name : ""}
          />
          <Input
            placeholder="Serial Number"
            defaultValue={isEdit ? device?.serialNumber : ""}
          />

          {/* 🔒 Edit ไม่ให้แก้ status / user / เวลา */}
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              * สามารถแก้ไขได้เฉพาะข้อมูลอุปกรณ์เท่านั้น
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button>
            {isEdit ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มอุปกรณ์"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
