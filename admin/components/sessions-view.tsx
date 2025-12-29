"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Grid3x3, List } from "lucide-react"
import { SessionsTable } from "./sessions-table"
import { mockSessions } from "@/lib/sessions.mock"
import { SessionsMobileGrid } from "./sessions-mobile-grid"

export function SessionsView() {
  const [viewMode, setViewMode] = useState<"table" | "mobile">("table")

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={viewMode === "table" ? "bg-primary/10" : ""}
          onClick={() => setViewMode("table")}
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={viewMode === "mobile" ? "bg-primary/10" : ""}
          onClick={() => setViewMode("mobile")}
        >
          <Grid3x3 className="w-4 h-4" />
        </Button>
      </div>

      {viewMode === "table" ? (
        <SessionsTable sessions={mockSessions} />
      ) : (
        <SessionsMobileGrid sessions={mockSessions} />
      )}
    </div>
  )
}
