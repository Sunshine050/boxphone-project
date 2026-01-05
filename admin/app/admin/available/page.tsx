"use client"

import { AvailableDevicesGrid } from "@/components/available-devices-grid"
import { motion } from "framer-motion"

export default function AvailableDevicesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      <div>
        <h1 className="text-3xl font-semibold mb-2">
          อุปกรณ์ที่พร้อมใช้งาน
        </h1>
        <p className="text-muted-foreground">
          จัดการอุปกรณ์ที่ว่าง ตรวจสอบสถานะ และมอบหมายให้ผู้ใช้งาน
        </p>
      </div>

      <AvailableDevicesGrid />
    </motion.div>
  )
}
