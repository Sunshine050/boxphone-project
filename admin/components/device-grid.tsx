"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Smartphone, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"

type DeviceStatus = "available" | "in-use" | "error"

interface Device {
  id: string
  name: string
  status: DeviceStatus
  user?: string
  remainingTime?: string
}

const mockDevices: Device[] = [
  { id: "1", name: "Android-001", status: "in-use", user: "john.doe@email.com", remainingTime: "45m 32s" },
  { id: "2", name: "Android-002", status: "available" },
  { id: "3", name: "Android-003", status: "in-use", user: "jane.smith@email.com", remainingTime: "1h 15m" },
  { id: "4", name: "Android-004", status: "error" },
  { id: "5", name: "Android-005", status: "available" },
  { id: "6", name: "Android-006", status: "in-use", user: "bob.wilson@email.com", remainingTime: "23m 10s" },
  { id: "7", name: "Android-007", status: "available" },
  { id: "8", name: "Android-008", status: "in-use", user: "alice.brown@email.com", remainingTime: "2h 05m" },
  { id: "9", name: "Android-009", status: "available" },
  { id: "10", name: "Android-010", status: "error" },
  { id: "11", name: "Android-011", status: "in-use", user: "charlie.davis@email.com", remainingTime: "38m 45s" },
  { id: "12", name: "Android-012", status: "available" },
]

const statusConfig: Record<DeviceStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  "in-use": { label: "In Use", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  error: { label: "Error", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
}

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

export function DeviceGrid() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Button className="gap-2 h-9">
          All Devices
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
            1240
          </Badge>
        </Button>
        <Button variant="ghost" className="gap-2 h-9">
          Active
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs bg-muted">
            845
          </Badge>
        </Button>
        <Button variant="ghost" className="gap-2 h-9">
          Available
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs bg-muted">
            390
          </Badge>
        </Button>
        <Button variant="ghost" className="gap-2 h-9">
          Maintenance
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs bg-muted">
            5
          </Badge>
        </Button>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {mockDevices.slice(0, 6).map((device, index) => (
          <motion.div key={device.id} variants={item}>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {index === 0 ? "Pixel 8 Pro" : index === 1 ? "Galaxy S24" : "Pixel 7a"}
                      </h3>
                      <Badge
                        className={`${
                          device.status === "in-use"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-green-500/10 text-green-500 border-green-500/20"
                        } rounded-full text-xs px-2`}
                      >
                        {device.status === "in-use" ? "IN USE" : "AVAILABLE"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {index === 0 ? "P8-US-842" : index === 1 ? "S24-EU-118" : "P7a-US-009"}
                    </p>
                  </div>
                </div>

                {device.status === "in-use" && device.user && (
                  <>
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                        {device.user.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-foreground truncate">{device.user.split(".")[0]}.dev</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>SESSION TIME</span>
                      <span className="font-mono text-foreground">01:45:20</span>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1">View Device</Button>
                      <Button variant="outline" size="icon" className="bg-transparent">
                        <Smartphone className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}

                {device.status === "available" && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-green-500 mb-4">
                      <CheckCircle className="w-4 h-4" />
                      <span>System Healthy & Ready</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 bg-transparent">
                        Inspect
                      </Button>
                      <Button className="flex-1">Assign</Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
