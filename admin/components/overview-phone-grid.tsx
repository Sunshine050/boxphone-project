"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Eye, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DeviceStatus = "in-use" | "available" | "error" | "maintenance";
type StatusFilter = DeviceStatus | "all";

interface OverviewDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  user?: string;
}

interface OverviewPhoneGridProps {
  query: string;
  statusFilter: StatusFilter;
}

const mockOverviewDevices: OverviewDevice[] = [
  {
    id: "1",
    name: "Pixel 8 Pro",
    status: "in-use",
    user: "john.doe@email.com",
  },
  { id: "2", name: "Galaxy S24", status: "available" },
  { id: "3", name: "Pixel 7a", status: "in-use", user: "alice@email.com" },
  { id: "4", name: "Pixel 6", status: "error" },
  { id: "5", name: "Galaxy A54", status: "maintenance" },
  { id: "6", name: "Pixel 8", status: "available" },
];

export function OverviewPhoneGrid({
  query,
  statusFilter,
}: OverviewPhoneGridProps) {
  const filteredDevices = mockOverviewDevices.filter((d) => {
    const matchQuery =
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.user?.toLowerCase().includes(query.toLowerCase());

    const matchStatus = statusFilter === "all" || d.status === statusFilter;

    return matchQuery && matchStatus;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
      {filteredDevices.map((d, index) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          whileHover={{ y: -4 }}
          className="
            relative
            rounded-2xl
            border border-border/70
            bg-card
            overflow-hidden
            shadow-sm
            transition-all
            hover:shadow-lg
          "
        >
          {/* Status badge (floating) */}
          <div className="absolute top-2 right-2 z-10">
            <StatusBadge status={d.status} />
          </div>

          {/* Phone Screen */}
          <div
            className="
              aspect-[9/16]
              bg-gradient-to-b from-neutral-900 to-black
              flex items-center justify-center
              text-muted-foreground text-xs
              ring-1 ring-inset ring-white/10
            "
          >
            {d.name}
          </div>

          {/* Info */}
          <div className="p-4 space-y-2">
            <p className="text-sm font-semibold truncate">{d.name}</p>

            {d.user ? (
              <p className="text-xs text-muted-foreground truncate">{d.user}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No active session
              </p>
            )}

            <div className="flex items-center justify-end gap-1 pt-2">
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Eye className="w-4 h-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={d.status === "maintenance"}
              >
                <Power className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: DeviceStatus }) {
  const map: Record<DeviceStatus, { label: string; className: string }> = {
    "in-use": {
      label: "In Use",
      className: "border-2 border-red-500/60 bg-red-500/10 text-red-500",
    },
    available: {
      label: "Available",
      className: "border-2 border-green-500/60 bg-green-500/10 text-green-500",
    },
    error: {
      label: "Error",
      className:
        "border-2 border-yellow-500/60 bg-yellow-500/10 text-yellow-400",
    },
    maintenance: {
      label: "Maintenance",
      className: "border-2 border-border bg-muted text-muted-foreground",
    },
  };

  const s = map[status];

  return (
    <Badge
      className={`
        rounded-full
        px-3 py-0.5
        text-[11px]
        font-medium
        backdrop-blur
        ${s.className}
      `}
    >
      {s.label}
    </Badge>
  );
}
