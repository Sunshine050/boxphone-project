"use client"

import { DeviceManagementTable } from "@/components/device-management-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { motion } from "framer-motion"

export default function DeviceManagementPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Device Management</h1>
          <p className="text-muted-foreground">Register and manage physical devices</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Register Device
        </Button>
      </div>

      <DeviceManagementTable />
    </motion.div>
  )
}
