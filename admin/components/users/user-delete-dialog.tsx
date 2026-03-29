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
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!user) return;

    try {
      await UsersService.delete(user.id);
      toast({ title: "ลบผู้ใช้แล้ว", description: `${user.name} (@${user.username})` });
      onDeleted();
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "ลบผู้ใช้ไม่สำเร็จ", description: err?.message || "เกิดข้อผิดพลาด" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-xl sm:rounded-lg">
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
