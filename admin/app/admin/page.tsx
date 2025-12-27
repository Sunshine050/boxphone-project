"use client"

import { DeviceGrid } from "@/components/device-grid"
import { StatsCards } from "@/components/stats-cards"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function AdminOverviewPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">System Overview</h1>
      </div>

      <StatsCards />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Filter by ID, OS..." className="pl-10" />
        </div>
      </div>

      <DeviceGrid />
    </motion.div>
  )
}
