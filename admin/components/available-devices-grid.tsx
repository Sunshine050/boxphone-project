"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Smartphone } from "lucide-react"
import { motion } from "framer-motion"
import { AssignUserDialog } from "./assign-user-dialog"

/* ================= TYPES ================= */

interface AvailableDevice {
  id: string
  name: string
  androidVersion: string
}

/* ================= MOCK DATA ================= */

const mockDevices: AvailableDevice[] = [
  { id: "1", name: "Android-002", androidVersion: "Android 13" },
  { id: "2", name: "Android-005", androidVersion: "Android 14" },
  { id: "3", name: "Android-007", androidVersion: "Android 13" },
  { id: "4", name: "Android-009", androidVersion: "Android 12" },
]

/* ================= COMPONENT ================= */

export function AvailableDevicesGrid() {
  const [selected, setSelected] = useState<AvailableDevice | null>(null)

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          show: { transition: { staggerChildren: 0.06 } },
        }}
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {mockDevices.map((device) => (
          <motion.div
            key={device.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0 },
            }}
          >
            <Card className="bg-card border-border/70 transition hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-mono text-sm font-medium">
                      {device.name}
                    </h3>
                  </div>

                  <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                    พร้อมใช้งาน
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-xs">
                  <p className="text-muted-foreground">
                    เวอร์ชัน Android
                  </p>
                  <p className="font-medium">
                    {device.androidVersion}
                  </p>
                </div>

                <Button
                  className="w-full cursor-pointer"
                  onClick={() => setSelected(device)}
                >
                  มอบหมายผู้ใช้งาน
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Dialog มอบหมายผู้ใช้ */}
      {selected && (
        <AssignUserDialog
          device={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
