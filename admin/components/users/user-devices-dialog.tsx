"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeviceMini, UserDeviceAssigned } from "./user-table";

function formatHMS(sec: number) {
  if (!sec || sec <= 0) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export function UserDevicesDialog({
  open,
  onClose,
  devices,
  deviceMap,
}: {
  open: boolean;
  onClose: () => void;
  devices: UserDeviceAssigned[];
  deviceMap: Record<string, DeviceMini>;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0c0c0e] border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>อุปกรณ์ของผู้ใช้</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {devices.map((d, i) => {
            const meta = deviceMap[d.device_id];
            const total = d.assign_seconds || 1;
            const percent = Math.min(100, (d.assign_seconds || 0) / total * 100);

            return (
              <div key={i} className="border border-zinc-800 rounded-xl p-3 bg-zinc-900/40">
                <div className="flex justify-between text-sm mb-1">
                  <span>{meta?.name || `รหัส ..${d.device_id.slice(-4)}`}</span>
                  <span className="font-mono">{formatHMS(d.assign_seconds || 0)}</span>
                </div>

                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${percent < 20 ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}