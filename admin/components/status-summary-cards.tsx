"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Smartphone } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

/* ================= TYPES ================= */

interface StatusItem {
  label: string
  count: number
  variant: "inUse" | "available" | "error" | "maintenance"
}

/* ================= DATA ================= */

const items: StatusItem[] = [
  { label: "กำลังใช้งาน", count: 845, variant: "inUse" },
  { label: "พร้อมใช้งาน", count: 390, variant: "available" },
  { label: "เกิดข้อผิดพลาด", count: 3, variant: "error" },
  { label: "อยู่ระหว่างซ่อมบำรุง", count: 2, variant: "maintenance" },
]

/* ================= STYLE MAP ================= */

const accentMap: Record<StatusItem["variant"], string> = {
  inUse: "from-red-500/30",
  available: "from-green-500/30",
  error: "from-yellow-500/30",
  maintenance: "from-muted/40",
}

/* ================= COMPONENT ================= */

export function StatusSummaryCards() {
  return (
    <div
      className="
        grid gap-4
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-4
      "
    >
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <Card
            className="
              relative overflow-hidden
              bg-card border-border/70
              ring-1 ring-border/40
              transition
              hover:ring-border
            "
          >
            {/* Accent gradient */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-r to-transparent",
                accentMap[item.variant]
              )}
            />

            <CardContent className="relative p-5 flex items-center justify-between">
              {/* Left */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {item.label}
                </p>
                <p className="text-3xl font-semibold tracking-tight">
                  {item.count}
                </p>
              </div>

              {/* Right */}
              <div className="flex flex-col items-end gap-2">
                <Badge variant={item.variant}>
                  {item.label}
                </Badge>
                <Smartphone className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
