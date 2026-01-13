"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UsersService } from "@/services/users.service";
import { User } from "@/types/user";

export function UserDeleteDialog({
  user,
  open,
  onClose,
  onDeleted,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const handleDelete = async () => {
    if (!user) return;

    try {
      await UsersService.delete(user.id);
      onDeleted(); // 🔁 ให้ parent รีเฟรช list
      onClose();
    } catch (error) {
      console.error("Delete user failed:", error);
      alert("ไม่สามารถลบผู้ใช้ได้");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลบผู้ใช้</DialogTitle>
        </DialogHeader>

        <p className="text-sm">
          ต้องการลบผู้ใช้{" "}
          <strong className="font-semibold">
            {user?.username}
          </strong>{" "}
          ใช่หรือไม่?
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            ลบ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
