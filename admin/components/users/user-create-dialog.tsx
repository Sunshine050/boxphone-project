"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UsersService } from "@/services/users.service";

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function UserCreateDialog({
  open,
  onClose,
  onCreated,
}: UserCreateDialogProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !username || !password) return;

    setLoading(true);
    try {
      await UsersService.createByAdmin({
        name,
        username,
        password,
      });

      onCreated?.();

      onClose();
      setName("");
      setUsername("");
      setPassword("");
    } catch (err: any) {
      alert(err.message || "สร้างผู้ใช้ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>สร้างผู้ใช้ใหม่</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>ชื่อผู้ใช้ (Name)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น User1"
              required
            />
          </div>

          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
            />
          </div>

          <div>
            <Label>Password</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
