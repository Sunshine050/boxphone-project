"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { motion } from "framer-motion"
import { Eye, Power } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Session } from "@/lib/sessions.mock"

export function SessionsTable({ sessions }: { sessions: Session[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sessions.map((s, index) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-accent/5"
                >
                  <TableCell>{s.userName}</TableCell>
                  <TableCell>{s.deviceName}</TableCell>
                  <TableCell>{s.startTime}</TableCell>
                  <TableCell className="font-mono text-green-500">
                    {s.remainingTime}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Power className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatusBadge({ status }: { status: Session["status"] }) {
  const map: Record<
    Session["status"],
    { label: string; className: string }
  > = {
    "in-use": {
      label: "In Use",
      className:
        "border-red-500/30 bg-red-500/10 text-red-500",
    },
    available: {
      label: "Available",
      className:
        "border-green-500/30 bg-green-500/10 text-green-500",
    },
    error: {
      label: "Error",
      className:
        "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    },
    maintenance: {
      label: "Maintenance",
      className:
        "border-border bg-muted text-muted-foreground",
    },
  }

  const s = map[status]

  return (
    <Badge
      className={`rounded-full px-3 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </Badge>
  )
}

