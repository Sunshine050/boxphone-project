"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface LogoutConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmDialog({
  open,
  onClose,
  onConfirm,
}: LogoutConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ยืนยันการออกจากระบบ</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          คุณต้องการออกจากระบบผู้ดูแลใช่หรือไม่
        </p>

        <DialogFooter className="mt-4 gap-2">
          <button
            onClick={onClose}
            className="
              px-4 py-2 rounded-lg
              text-sm
              border border-border
              hover:bg-muted
              transition
            "
          >
            ยกเลิก
          </button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            className="
              px-4 py-2 rounded-lg
              text-sm font-semibold
              bg-red-500 text-white
              hover:bg-red-600
              transition
            "
          >
            ออกจากระบบ
          </motion.button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
