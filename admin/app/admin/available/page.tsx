"use client"

import { AvailableDevicesGrid } from "@/components/available-devices-grid"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { History, RefreshCw } from "lucide-react"

export default function AvailableDevicesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span>Management</span>
            <span>&gt;</span>
            <span className="text-primary">Available Devices</span>
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Available Devices</h1>
          <p className="text-muted-foreground">Manage idle units, verify integrity, and assign to users.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 bg-transparent">
            <History className="w-4 h-4" />
            History
          </Button>
          <Button className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </Button>
        </div>
      </div>

      <AvailableDevicesGrid />
    </motion.div>
  )
}
