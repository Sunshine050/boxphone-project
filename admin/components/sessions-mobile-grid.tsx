"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Eye, Power } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Session } from "@/lib/sessions.mock"

export function SessionsMobileGrid({ sessions }: { sessions: Session[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {sessions.map((s, index) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-xl border bg-card overflow-hidden"
        >
          {/* Phone */}
          <div className="aspect-[9/16] bg-black flex items-center justify-center text-muted-foreground">
            {s.deviceName}
          </div>

          {/* Info */}
          <div className="p-3 space-y-2">
            <p className="font-medium text-sm truncate">{s.userName}</p>
            <p className="font-mono text-green-500 text-sm">
              {s.remainingTime}
            </p>

            <div className="flex items-center justify-between">
              <StatusBadge status={s.status} />
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <Power className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: Session["status"] }) {
  const map: Record<
    Session["status"],
    { label: string; className: string }
  > = {
    "in-use": {
      label: "In Use",
      className: "bg-red-500/10 text-red-500 border-red-500/30",
    },
    available: {
      label: "Available",
      className: "bg-green-500/10 text-green-500 border-green-500/30",
    },
    error: {
      label: "Error",
      className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    },
    maintenance: {
      label: "Maintenance",
      className: "bg-muted text-muted-foreground border-border",
    },
  }

  const s = map[status]

  return (
    <Badge className={`rounded-full px-3 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </Badge>
  )
}
