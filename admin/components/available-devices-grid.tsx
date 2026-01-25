"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { AssignUserDialog } from "./assign-user-dialog";
import { AvailableDevice } from "@/app/admin/available/page";

interface Props {
  loading: boolean;
  devices: AvailableDevice[];

  selected: AvailableDevice | null;
  onSelect: (device: AvailableDevice) => void;
  onCloseDialog: () => void;

  onSuccess?: () => void;
}

export function AvailableDevicesGrid({
  loading,
  devices,
  selected,
  onSelect,
  onCloseDialog,
  onSuccess,
}: Props) {
  if (loading) {
    return <div className="text-muted-foreground">กำลังโหลดอุปกรณ์...</div>;
  }

  if (devices.length === 0) {
    return (
      <div className="text-muted-foreground">
        ยังไม่มีอุปกรณ์ที่พร้อมใช้งาน (AVAILABLE)
      </div>
    );
  }

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
        {devices.map((device) => (
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
                    <div className="flex flex-col">
                      <h3 className="font-mono text-sm font-medium">
                        {device.name}
                      </h3>
                      <span className="text-xs text-muted-foreground font-mono">
                        SN: {device.serial_number}
                      </span>
                    </div>
                  </div>

                  <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                    พร้อมใช้งาน
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-xs">
                  <p className="text-muted-foreground">ข้อมูลเครื่อง</p>
                  <p className="font-medium">
                    {device.model ? device.model : "-"}{" "}
                    {device.sdk_version ? `(SDK ${device.sdk_version})` : ""}
                  </p>
                </div>

                <Button className="w-full cursor-pointer" onClick={() => onSelect(device)}>
                  มอบหมายผู้ใช้งาน
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ✅ Dialog */}
      {selected && (
        <AssignUserDialog
          device={selected}
          onClose={onCloseDialog}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}
