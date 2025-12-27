"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { motion } from "framer-motion"

type DeviceStatus = "available" | "in-use" | "error" | "maintenance"

interface Device {
  id: string
  name: string
  serialNumber: string
  androidVersion: string
  status: DeviceStatus
  lastHeartbeat: string
}

const mockDevices: Device[] = [
  {
    id: "1",
    name: "Android-001",
    serialNumber: "SN-001-ABC",
    androidVersion: "13",
    status: "in-use",
    lastHeartbeat: "2 min ago",
  },
  {
    id: "2",
    name: "Android-002",
    serialNumber: "SN-002-DEF",
    androidVersion: "14",
    status: "available",
    lastHeartbeat: "1 min ago",
  },
  {
    id: "3",
    name: "Android-003",
    serialNumber: "SN-003-GHI",
    androidVersion: "13",
    status: "in-use",
    lastHeartbeat: "3 min ago",
  },
  {
    id: "4",
    name: "Android-004",
    serialNumber: "SN-004-JKL",
    androidVersion: "12",
    status: "error",
    lastHeartbeat: "45 min ago",
  },
  {
    id: "5",
    name: "Android-005",
    serialNumber: "SN-005-MNO",
    androidVersion: "14",
    status: "available",
    lastHeartbeat: "1 min ago",
  },
  {
    id: "6",
    name: "Android-006",
    serialNumber: "SN-006-PQR",
    androidVersion: "13",
    status: "in-use",
    lastHeartbeat: "2 min ago",
  },
  {
    id: "7",
    name: "Android-007",
    serialNumber: "SN-007-STU",
    androidVersion: "14",
    status: "maintenance",
    lastHeartbeat: "2h ago",
  },
]

const statusConfig: Record<DeviceStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  "in-use": { label: "In Use", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  error: { label: "Error", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  maintenance: { label: "Maintenance", className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
}

export function DeviceManagementTable() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">All Devices ({mockDevices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Device</TableHead>
                <TableHead className="text-muted-foreground">Serial Number</TableHead>
                <TableHead className="text-muted-foreground">Android</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Last Heartbeat</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockDevices.map((device, index) => (
                <motion.tr
                  key={device.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="border-border"
                >
                  <TableCell className="font-medium font-mono text-foreground">{device.name}</TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">{device.serialNumber}</code>
                  </TableCell>
                  <TableCell className="text-foreground">Android {device.androidVersion}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusConfig[device.status].className}>
                      {statusConfig[device.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{device.lastHeartbeat}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      {device.status === "error" && (
                        <Button variant="ghost" size="sm">
                          Mark Fixed
                        </Button>
                      )}
                      {device.status === "in-use" && (
                        <Button variant="destructive" size="sm">
                          Force Unlock
                        </Button>
                      )}
                      {device.status === "available" && (
                        <Button variant="ghost" size="sm">
                          Maintenance
                        </Button>
                      )}
                    </div>
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
