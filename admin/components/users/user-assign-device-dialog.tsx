"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { User } from "./user-table";

/* ===== MOCK DEVICES ===== */
const availableDevices = [
  { id: "PHONE-01", name: "Pixel 8 Pro" },
  { id: "PHONE-02", name: "Galaxy S24" },
  { id: "PHONE-03", name: "Pixel 7a" },
];

interface Props {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

export function UserAssignDeviceDialog({ user, open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>กำหนดเครื่องให้ผู้ใช้</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {user?.name} ({user?.username})
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* ===== Select Device (multi) ===== */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              เลือกอุปกรณ์
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="เลือกเครื่อง (เลือกได้หลายเครื่อง)" />
              </SelectTrigger>
              <SelectContent>
                {availableDevices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ===== Package ===== */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              แพ็กเกจเวลา
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="เลือกแพ็กเกจ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 ชั่วโมง</SelectItem>
                <SelectItem value="1d">1 วัน</SelectItem>
                <SelectItem value="1w">1 สัปดาห์</SelectItem>
                <SelectItem value="1m">1 เดือน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ===== Start Time ===== */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              เวลาเริ่มใช้งาน
            </label>
            <Input type="datetime-local" />
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button className="bg-primary">
            ยืนยันการกำหนดเครื่อง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
