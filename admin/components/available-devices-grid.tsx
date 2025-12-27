"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Smartphone } from "lucide-react"
import { motion } from "framer-motion"

interface AvailableDevice {
  id: string
  name: string
  androidVersion: string
}

const mockDevices: AvailableDevice[] = [
  { id: "1", name: "Android-002", androidVersion: "Android 13" },
  { id: "2", name: "Android-005", androidVersion: "Android 14" },
  { id: "3", name: "Android-007", androidVersion: "Android 13" },
  { id: "4", name: "Android-009", androidVersion: "Android 12" },
  { id: "5", name: "Android-012", androidVersion: "Android 14" },
  { id: "6", name: "Android-015", androidVersion: "Android 13" },
  { id: "7", name: "Android-018", androidVersion: "Android 14" },
  { id: "8", name: "Android-021", androidVersion: "Android 13" },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
}

export function AvailableDevicesGrid() {
  return (
    <div>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {mockDevices.map((device) => (
          <motion.div key={device.id} variants={item}>
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-mono text-sm font-medium text-foreground">{device.name}</h3>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    Available
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs space-y-1">
                  <p className="text-muted-foreground">Version</p>
                  <p className="text-foreground font-medium">{device.androidVersion}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    Assign User
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1">
                    Maintenance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
