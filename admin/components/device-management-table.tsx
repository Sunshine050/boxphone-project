"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { motion } from "framer-motion"

type DeviceStatus = "available" | "in-use"

interface Device {
  id: string
  name: string
  serialNumber: string
  status: DeviceStatus
}

const mockDevices: Device[] = [
  {
    id: "1",
    name: "Android-001",
    serialNumber: "SN-001-ABC",
    status: "in-use",
  },
  {
    id: "2",
    name: "Android-002",
    serialNumber: "SN-002-DEF",
    status: "available",
  },
  {
    id: "3",
    name: "Android-003",
    serialNumber: "SN-003-GHI",
    status: "in-use",
  },
  {
    id: "4",
    name: "Android-004",
    serialNumber: "SN-004-JKL",
    status: "in-use",
  },
  {
    id: "5",
    name: "Android-005",
    serialNumber: "SN-005-MNO",
    status: "available",
  },
  {
    id: "6",
    name: "Android-006",
    serialNumber: "SN-006-PQR",
    status: "in-use",
  },
  {
    id: "7",
    name: "Android-007",
    serialNumber: "SN-007-STU",
    status: "in-use",
  },
]

const statusConfig: Record<DeviceStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  "in-use": { label: "In Use", className: "bg-red-500/10 text-red-500 border-red-500/20" },
}

export function DeviceManagementTable() {
  // เพิ่ม Column สำหรับ การนับเวลาถอยหลังถ้ามีการใช้งานอยู่ "เวลาคงเหลือ"
  // เพิ่มกล่อง dialog รายละเอียดเพื่่อแสดงข้อมูล device, status, user ที่ใช้งานอยู่, เวลาคงเหลือ
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
                <TableHead className="text-muted-foreground">Status</TableHead>
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
                    <Badge variant="outline" className={statusConfig[device.status].className}>
                      {statusConfig[device.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
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
