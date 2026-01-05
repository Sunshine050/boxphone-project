"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

export function UserTimeDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มเวลาใช้งาน</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="เลือกแพ็กเกจเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 ชั่วโมง</SelectItem>
              <SelectItem value="1d">1 วัน</SelectItem>
              <SelectItem value="1w">1 สัปดาห์</SelectItem>
              <SelectItem value="1m">1 เดือน</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>ยืนยัน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
