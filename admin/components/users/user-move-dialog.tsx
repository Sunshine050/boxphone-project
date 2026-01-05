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

const devices = ["PHONE-01", "PHONE-02", "PHONE-03"]

export function UserMoveDialog({
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
          <DialogTitle>ย้ายไปเครื่องอื่น</DialogTitle>
        </DialogHeader>

        <Select>
          <SelectTrigger>
            <SelectValue placeholder="เลือกเครื่อง" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button onClick={onClose}>ย้ายเครื่อง</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
