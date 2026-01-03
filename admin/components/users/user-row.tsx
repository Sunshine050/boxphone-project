"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Smartphone,
  Clock,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { User } from "./user-table";

export function UserRow({
  user,
  index,
  onOpen,
}: {
  user: User;
  index: number;
  onOpen: (type: "sessions" | "time" | "move" | "delete") => void;
}) {
  const [showPass, setShowPass] = useState(false);

  const percent = (user.remainingSeconds / user.totalSeconds) * 100;

  const format = (sec: number) =>
    new Date(sec * 1000).toISOString().substring(11, 19);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border-b last:border-b-0"
    >
      <td className="p-4 text-left font-medium">{user.name}</td>
      <td className="text-center font-mono text-sm">{user.username}</td>

      <td className="text-center">
        <div className="flex items-center justify-center gap-2 font-mono">
          {showPass ? user.password : "•".repeat(user.password.length)}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowPass(!showPass)}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        </div>
      </td>

      <td className="text-center">
        <Badge
          className={
            user.status === "online"
              ? "bg-green-500/10 text-green-500 border-green-500/30"
              : "bg-gray-500/10 text-gray-500 border-gray-500/30"
          }
        >
          {user.status === "online" ? "ออนไลน์" : "ออฟไลน์"}
        </Badge>
      </td>

      <td className="text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-mono">
            {format(user.remainingSeconds)}
          </span>
          <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${
                percent < 20 ? "bg-red-500" : "bg-green-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </td>

      <td className="text-center text-sm">{user.sessions.length}</td>

      <td className="p-4">
        <div className="flex justify-end gap-1">
          {/* Sessions */}
          <Button
            size="icon"
            variant="outline"
            onClick={() => onOpen("sessions")}
            className="
        cursor-pointer
        transition
        hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600
      "
            title="ดู Sessions"
          >
            <Smartphone size={16} />
          </Button>

          {/* Time */}
          <Button
            size="icon"
            variant="outline"
            onClick={() => onOpen("time")}
            className="
        cursor-pointer
        transition
        hover:bg-purple-50 hover:border-purple-400 hover:text-purple-600
      "
            title="จัดการเวลา"
          >
            <Clock size={16} />
          </Button>

          {/* Move */}
          <Button
            size="icon"
            variant="outline"
            onClick={() => onOpen("move")}
            className="
        cursor-pointer
        transition
        hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600
      "
            title="ย้าย Session"
          >
            <RefreshCcw size={16} />
          </Button>

          {/* Delete */}
          <Button
            size="icon"
            variant="destructive"
            onClick={() => onOpen("delete")}
            className="
        cursor-pointer
        transition
        hover:bg-red-600
      "
            title="ลบผู้ใช้"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}
