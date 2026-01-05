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
  PlusCircle,
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
  onOpen: (type: "sessions" | "time" | "move" | "delete" | "assign") => void;
}) {
  const [showPass, setShowPass] = useState(false);

  /* ===== helper ===== */
  const hasActiveTime = user.totalSeconds > 0 && user.sessions.length > 0;

  const percent = hasActiveTime
    ? (user.remainingSeconds / user.totalSeconds) * 100
    : 0;

  const format = (sec: number) =>
    new Date(sec * 1000).toISOString().substring(11, 19);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border-b last:border-b-0"
    >
      {/* ===== Name ===== */}
      <td className="p-4 text-left font-medium">{user.name}</td>

      {/* ===== Username ===== */}
      <td className="text-center font-mono text-sm">{user.username}</td>

      {/* ===== Password ===== */}
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

      {/* ===== Status ===== */}
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

      {/* ===== Time Progress (แก้ตรงนี้) ===== */}
      <td className="text-center">
        {hasActiveTime ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-mono">
              {format(user.remainingSeconds)}
            </span>

            <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  percent < 20 ? "bg-red-500" : "bg-green-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <span className="text-xs italic">ยังไม่เริ่มใช้งาน</span>
            <div className="h-1.5 w-24 bg-muted rounded-full" />
          </div>
        )}
      </td>

      {/* ===== Sessions Count ===== */}
      <td className="text-center text-sm">{user.sessions.length}</td>

      {/* ===== Actions ===== */}
      <td className="p-4">
        <div className="flex justify-end gap-1">
          {/* ===== กรณีมี Session ===== */}
          {user.sessions.length > 0 ? (
            <>
              {/* ดู Sessions */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => onOpen("sessions")}
                title="ดู Sessions"
                className="
            cursor-pointer
            hover:bg-blue-50
            hover:border-blue-400
            hover:text-blue-600
          "
              >
                <Smartphone size={16} />
              </Button>

              {/* จัดการเวลา */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => onOpen("time")}
                title="จัดการเวลา"
                className="
            cursor-pointer
            hover:bg-purple-50
            hover:border-purple-400
            hover:text-purple-600
          "
              >
                <Clock size={16} />
              </Button>

              {/* ย้าย Session */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => onOpen("move")}
                title="ย้าย Session"
                className="
            cursor-pointer
            hover:bg-orange-50
            hover:border-orange-400
            hover:text-orange-600
          "
              >
                <RefreshCcw size={16} />
              </Button>
            </>
          ) : (
            <>
              {/* ===== Assign Device (ใหม่) ===== */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => onOpen("assign")}
                title="Assign Device"
                className="
            cursor-pointer
            hover:bg-emerald-50
            hover:border-emerald-400
            hover:text-emerald-600
          "
              >
                <PlusCircle size={16} />
              </Button>
            </>
          )}

          {/* ===== Delete (มีเสมอ) ===== */}
          <Button
            size="icon"
            variant="destructive"
            onClick={() => onOpen("delete")}
            title="ลบผู้ใช้"
            className="cursor-pointer hover:bg-red-600"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}
