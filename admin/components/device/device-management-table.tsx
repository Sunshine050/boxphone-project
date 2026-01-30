"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { motion } from "framer-motion";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";

/* ================= TYPES (match backend) ================= */

export type DeviceStatus = "AVAILABLE" | "BUSY" | "OFFLINE";

export interface Device {
  id: string;
  name: string;
  serial_number: string;
  status: DeviceStatus;
  current_user_id?: string | null;
}

/* ================= PROPS ================= */

interface Props {
  devices: Device[];
  onView: (device: Device) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void; // ✅ เพิ่ม onDelete
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  AVAILABLE: {
    label: "ว่าง",
    className: "bg-green-500/10 text-green-600",
  },
  BUSY: {
    label: "กำลังใช้งาน",
    className: "bg-red-500/10 text-red-600",
  },
  OFFLINE: {
    label: "ออฟไลน์",
    className: "bg-gray-500/10 text-gray-500",
  },
  UNKNOWN: {
    label: "ไม่ทราบ",
    className: "bg-muted text-muted-foreground",
  },
};


/* ================= COMPONENT ================= */

export function DeviceManagementTable({
  devices,
  onView,
  onEdit,
  onDelete,
}: Props) {
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
                    ยังไม่มีข้อมูลอุปกรณ์
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
                        {d.serial_number}
                      </span>
                    </div>
                  </TableCell>

                  {/* USER */}
                  <TableCell className="text-center text-sm">
                    {d.current_user_id ? (
                      <span className="font-medium">{d.current_user_id}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* STATUS */}
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Badge className={statusConfig[d.status]?.className || statusConfig["UNKNOWN"].className}>
                        {statusConfig[d.status]?.label || statusConfig["UNKNOWN"].label}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* ACTIONS (✅ จุดสามจุด + toolbox) */}
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="outline">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => onView(d)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            ดูรายละเอียด
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => onEdit(d)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            แก้ไข
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => onDelete(d)}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            ลบอุปกรณ์
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
