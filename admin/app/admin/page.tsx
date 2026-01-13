"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { OverviewPhoneGrid, type OverviewDevice } from "@/components/overview-phone-grid"
import { StatusSummaryCards } from "@/components/status-summary-cards"
import { Button } from "@/components/ui/button"

export type DeviceStatus =
  | "all"
  | "in-use"
  | "available"
  | "error"
  | "maintenance"

export default function AdminOverviewPage() {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<DeviceStatus>("all")
  const [devices] = useState<OverviewDevice[]>([]) // TODO: will be filled from API later

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-1">
          ภาพรวมระบบ
        </h1>
        <p className="text-sm text-muted-foreground">
          สถานะเครื่อง Android แบบเรียลไทม์
        </p>
      </div>

      {/* สรุปสถานะ */}
      <StatusSummaryCards />

      {/* ตัวกรอง */}
      <div className="flex flex-wrap items-center gap-3">
        {/* ค้นหา */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อเครื่อง / ผู้ใช้"
            className="pl-10"
          />
        </div>

        {/* กรองตามสถานะ */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "ทั้งหมด" },
            { key: "in-use", label: "กำลังใช้งาน" },
            { key: "available", label: "ว่าง" },
            { key: "error", label: "ผิดพลาด" },
            { key: "maintenance", label: "ซ่อมบำรุง" },
          ].map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={statusFilter === s.key ? "default" : "outline"}
              onClick={() =>
                setStatusFilter(s.key as DeviceStatus)
              }
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* กริดเครื่อง */}
      <OverviewPhoneGrid
        query={query}
        statusFilter={statusFilter}
        devices={devices}
      />
    </motion.div>
  )
}
