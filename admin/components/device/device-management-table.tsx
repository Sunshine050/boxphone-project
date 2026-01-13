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
import { Pencil } from "lucide-react";

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
  devices: Device[];
  onView: (device: Device) => void;
  onEdit: (device: Device) => void;
}

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

export function DeviceManagementTable({ devices, onView, onEdit }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle>อุปกรณ์ทั้งหมด</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            {/* ===== TABLE HEADER ===== */}
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">อุปกรณ์</TableHead>
                <TableHead className="text-center">ผู้ใช้งาน</TableHead>
                <TableHead className="text-center">สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>

            {/* ===== TABLE BODY ===== */}
            <TableBody>
              {devices.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    ยังไม่มีข้อมูลอุปกรณ์ (รอเชื่อมต่อ API)
                  </TableCell>
                </TableRow>
              )}

              {devices.map((d, i) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b last:border-b-0"
                >
                  {/* Device */}
                  <TableCell className="text-left font-mono">
                    <div className="flex flex-col items-left">
                      <span>{d.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.serialNumber}
                      </span>
                    </div>
                  </TableCell>

                  {/* USER */}
                  <TableCell className="text-center text-sm">
                    {d.user ? (
                      <span className="font-medium">{d.user}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* STATUS */}
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Badge className={statusConfig[d.status].className}>
                        {statusConfig[d.status].label}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* ดูรายละเอียด (outline + hover ชัด) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(d)}
                        className="
    cursor-pointer
    border border-muted-foreground/30
    transition-all duration-300 ease-out
    hover:bg-blue-50
    hover:text-blue-600
    hover:border-blue-400
    hover:shadow-md
    hover:-translate-y-0.5
    active:translate-y-0
  "
                      >
                        ดูรายละเอียด
                      </Button>

                      {/* แก้ไข (icon + วงกลม + ฟ้า + hover effect) */}
                      <Button
                        size="icon"
                        onClick={() => onEdit(d)}
                        title="แก้ไข"
                        className="
        cursor-pointer
        rounded-full
        bg-blue-600 text-white
        border border-blue-700
        transition-all duration-200
        hover:bg-blue-700
        hover:scale-105
        hover:shadow-md
        active:scale-95
      "
                      >
                        <Pencil className="h-4 w-4" />
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
