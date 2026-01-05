"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { User } from "./user-table"

export function UserDeleteDialog({
  user,
  open,
  onClose,
}: {
  user: User | null
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลบผู้ใช้</DialogTitle>
        </DialogHeader>

        <p className="text-sm">
          ต้องการลบผู้ใช้{" "}
          <strong>{user?.username}</strong> ใช่หรือไม่
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="destructive">
            ลบ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
