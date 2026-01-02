"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

interface AssignUserDialogProps {
  device: {
    id: string
    name: string
  }
  onClose: () => void
}

export function AssignUserDialog({
  device,
  onClose,
}: AssignUserDialogProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-card rounded-xl w-full max-w-md p-6 space-y-5"
        >
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold">
              มอบหมายอุปกรณ์ให้ผู้ใช้
            </h2>
            <p className="text-sm text-muted-foreground">
              {device.name}
            </p>
          </div>

          {/* ผู้ใช้ */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              ผู้ใช้งาน
            </label>
            <Input placeholder="user@email.com" />
          </div>

          {/* แพ็กเกจเวลา */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              แพ็กเกจเวลา
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="เลือกแพ็กเกจ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 ชั่วโมง</SelectItem>
                <SelectItem value="1d">1 วัน</SelectItem>
                <SelectItem value="1w">1 สัปดาห์</SelectItem>
                <SelectItem value="1m">1 เดือน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* เวลาเริ่มต้น */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              เวลาเริ่มต้นใช้งาน
            </label>
            <Input type="datetime-local" />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              ยกเลิก
            </Button>
            <Button className="flex-1">
              ยืนยันการมอบหมาย
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
