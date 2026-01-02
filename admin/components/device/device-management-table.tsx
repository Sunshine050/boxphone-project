"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";

/* ================= TYPES ================= */

export type DeviceStatus = "available" | "in-use";

export interface Device {
  id: string;
  name: string;
  serialNumber: string;
  status: DeviceStatus;
  user?: string;
}

/* ================= PROPS ================= */

interface Props {
  onView: (device: Device) => void;
  onEdit: (device: Device) => void;
}

/* ================= MOCK ================= */

const mockDevices: Device[] = [
  {
    id: "1",
    name: "Android-001",
    serialNumber: "SN-001-ABC",
    status: "in-use",
    user: "john.doe",
  },
  {
    id: "2",
    name: "Android-002",
    serialNumber: "SN-002-DEF",
    status: "available",
  },
];

const statusConfig = {
  available: {
    label: "พร้อมใช้งาน",
    className: "bg-green-500/10 text-green-500 border-green-500/30",
  },
  "in-use": {
    label: "กำลังใช้งาน",
    className: "bg-red-500/10 text-red-500 border-red-500/30",
  },
};

/* ================= COMPONENT ================= */

export function DeviceManagementTable({ onView, onEdit }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle>อุปกรณ์ทั้งหมด</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>อุปกรณ์</TableHead>
                <TableHead>ผู้ใช้งาน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {mockDevices.map((d, i) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {/* Device */}
                  <TableCell className="font-mono">
                    {d.name}
                    <div className="text-xs text-muted-foreground">
                      {d.serialNumber}
                    </div>
                  </TableCell>

                  {/* USER */}
                  <TableCell className="text-sm">
                    {d.user ? (
                      <span className="font-medium">{d.user}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* STATUS */}
                  <TableCell>
                    <Badge className={statusConfig[d.status].className}>
                      {statusConfig[d.status].label}
                    </Badge>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(d)}
                      >
                        ดูรายละเอียด
                      </Button>
                      <Button size="sm" onClick={() => onEdit(d)}>
                        แก้ไข
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
  );
}
