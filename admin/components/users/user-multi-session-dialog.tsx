"use client";

import { useMemo } from "react";
import { SessionsService } from "@/services/sessions.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSessionTimer } from "@/hooks/useSessionTimer";

function formatHMS(sec: number) {
  if (!sec || sec <= 0) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:${String(s).padStart(2, "0")}`;
}

function SessionRow({
  session,
  onRefresh,
}: {
  session: any;
  onRefresh: () => void;
}) {
  const remaining = useSessionTimer(session);

  const percent = useMemo(() => {
    const total = session.total_seconds || 1;
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  }, [remaining, session]);

  const handlePause = async () => {
    await SessionsService.pause(session._id);
    onRefresh();
  };

  const handleResume = async () => {
    await SessionsService.resume(session._id);
    onRefresh();
  };

  const handleCancel = async () => {
    if (!confirm("Cancel session?")) return;
    await SessionsService.cancel(session._id);
    onRefresh();
  };

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex justify-between items-center">
        <div className="font-medium">
          เครื่อง: {session.device_id?.name || session.device_id}
        </div>

        <div className="text-sm font-mono">
          {formatHMS(remaining)}
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${
            percent < 20 ? "bg-red-500" : "bg-green-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex gap-2 pt-2">
        {session.status === "ACTIVE" && (
          <Button size="sm" variant="outline" onClick={handlePause}>
            Pause
          </Button>
        )}

        {(session.status === "PAUSED" ||
          session.status === "DISCONNECTED") && (
          <Button size="sm" onClick={handleResume}>
            Resume
          </Button>
        )}

        <Button
          size="sm"
          variant="destructive"
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function UserMultiSessionDialog({
  open,
  sessions,
  onClose,
  onRefresh,
}: {
  open: boolean;
  sessions: any[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>จัดการหลายอุปกรณ์</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {sessions.map((s) => (
            <SessionRow
              key={s._id}
              session={s}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}