"use client";

import { User, UserAction } from "@/types/user";
import { UserRow } from "./user-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UsersTable({
  users,
  currentUserId,
  onAction,
}: {
  users: User[];
  currentUserId: string | null;
  onAction: (action: UserAction, user: User) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>จัดการผู้ใช้</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b text-sm text-muted-foreground">
              <th className="p-4 text-left w-[16%]">ชื่อผู้ใช้</th>
              <th className="text-center w-[14%]">Username</th>
              <th className="text-center w-[20%]">Password</th>
              <th className="text-center w-[10%]">Role</th>
              <th className="text-center w-[12%]">สถานะ</th>
              <th className="text-center w-[14%]">เวลาใช้งาน</th>
              <th className="text-center w-[10%]">Device</th>
              <th className="p-4 text-right w-[14%]">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u, i) => (
              <UserRow
                key={u.id}
                user={u}
                index={i}
                currentUserId={currentUserId}
                onAction={(action) => onAction(action, u)}
              />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
