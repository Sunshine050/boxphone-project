"use client"

import { SessionsTable } from "@/components/sessions-table"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Download, RefreshCw } from "lucide-react"

export default function ActiveSessionsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Active Sessions Monitoring</h1>
          <p className="text-muted-foreground">Real-time control center for currently deployed Android devices</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export Log
          </Button>
          <Button className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      <SessionsTable />
    </motion.div>
  )
}
