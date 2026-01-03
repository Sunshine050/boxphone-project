"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { UserRow } from "./user-row";
import { UserSessionsDialog } from "./user-sessions-dialog";
import { UserTimeDialog } from "./user-time-dialog";
import { UserMoveDialog } from "./user-move-dialog";
import { UserDeleteDialog } from "./user-delete-dialog";

/* ===== TYPES ===== */

export interface UserSession {
  id: string;
  deviceId: string;
  deviceName: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  status: "online" | "offline";
  maxSessions: number;
  remainingSeconds: number;
  totalSeconds: number;
  sessions: UserSession[];
}

/* ===== MOCK ===== */

const mockUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    username: "john.doe",
    password: "password123",
    status: "online",
    maxSessions: 3,
    remainingSeconds: 4800,
    totalSeconds: 7200,
    sessions: [
      { id: "s1", deviceId: "PHONE-01", deviceName: "Pixel 8 Pro" },
      { id: "s2", deviceId: "PHONE-02", deviceName: "Galaxy S24" },
    ],
  },
];

export function UsersTable() {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<
    "sessions" | "time" | "move" | "delete" | null
  >(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filtered = mockUsers.filter((u) =>
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader className="space-y-4">
            <CardTitle>จัดการผู้ใช้</CardTitle>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาผู้ใช้"
                className="pl-10"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[8%]" />
                <col className="w-[14%]" />
              </colgroup>

              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="p-4 text-left">ชื่อผู้ใช้</th>
                  <th className="text-center">Username</th>
                  <th className="text-center">รหัสผ่าน</th>
                  <th className="text-center">สถานะ</th>
                  <th className="text-center">เวลาใช้งาน</th>
                  <th className="text-center">Session</th>
                  <th className="p-4 text-right">จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((u, i) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    index={i}
                    onOpen={(type) => {
                      setSelectedUser(u);
                      setDialog(type);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </motion.div>

      <UserSessionsDialog
        user={selectedUser}
        open={dialog === "sessions"}
        onClose={() => setDialog(null)}
      />
      <UserTimeDialog
        open={dialog === "time"}
        onClose={() => setDialog(null)}
      />
      <UserMoveDialog
        open={dialog === "move"}
        onClose={() => setDialog(null)}
      />
      <UserDeleteDialog
        user={selectedUser}
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
