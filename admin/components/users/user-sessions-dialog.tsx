"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { User } from "./user-table"

export function UserSessionsDialog({
  user,
  open,
  onClose,
}: {
  user: User | null
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Sessions ของ {user?.username}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {user?.sessions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="aspect-[9/16] bg-black flex items-center justify-center text-xs text-muted-foreground">
                {s.deviceName}
              </div>
              <div className="p-3 border-t">
                <p className="font-medium text-sm">{s.deviceName}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {s.deviceId}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
