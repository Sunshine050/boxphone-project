"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { OverviewPhoneGrid } from "@/components/overview-phone-grid"
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
          System Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time Android device farm status
        </p>
      </div>

      {/* Status Cards */}
      <StatusSummaryCards />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search device, user, OS..."
            className="pl-10"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "in-use", label: "In Use" },
            { key: "available", label: "Available" },
            { key: "error", label: "Error" },
            { key: "maintenance", label: "Maintenance" },
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

      {/* Phone Grid */}
      <OverviewPhoneGrid
        query={query}
        statusFilter={statusFilter}
      />
    </motion.div>
  )
}
