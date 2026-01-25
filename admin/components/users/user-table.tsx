"use client";

import { User, UserAction } from "@/types/user";
import { UserRow } from "./user-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

export type DeviceMini = {
  id: string;
  name: string;
  serial_number: string;
  status?: "AVAILABLE" | "BUSY" | "OFFLINE";
};

export type UserDeviceAssigned = {
  device_id: string;
  assign_seconds?: number; // optional (ถ้ามีใน backend)
};

export function UsersTable({
  users,
  currentUserId,
  onAction,
  deviceMap,
}: {
  users: User[];
  currentUserId: string | null;
  onAction: (action: UserAction, user: User) => void;
  deviceMap: Record<string, DeviceMini>;
}) {
  const getUserDevices = (u: any): UserDeviceAssigned[] => {
    // ✅ รองรับหลายรูปแบบจาก backend
    if (Array.isArray(u.devices) && u.devices.length > 0) {
      return u.devices.map((x: any) => ({
        device_id: String(x.device_id),
        assign_seconds: x.assign_seconds ?? x.remaining_seconds ?? undefined,
      }));
    }

    if (u.device_id) {
      return [
        {
          device_id: String(u.device_id),
        },
      ];
    }

    return [];
  };

  const rows = useMemo(() => {
    return users.map((u) => ({
      user: u,
      devices: getUserDevices(u),
    }));
  }, [users]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>จัดการผู้ใช้</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* ✅ responsive: ถ้าจอเล็กให้ scroll แนวนอน */}
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed min-w-[980px]">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="p-4 text-left w-[16%]">ชื่อผู้ใช้</th>
                <th className="text-center w-[14%]">Username</th>
                <th className="text-center w-[20%]">Password</th>
                <th className="text-center w-[10%]">Role</th>
                <th className="text-center w-[12%]">สถานะ</th>
                <th className="text-center w-[14%]">เวลาใช้งาน</th>
                <th className="text-center w-[12%]">Device</th>
                <th className="p-4 text-right w-[12%]">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(({ user: u, devices }, i) => (
                <UserRow
                  key={u.id}
                  user={u}
                  index={i}
                  currentUserId={currentUserId}
                  userDevices={devices}
                  deviceMap={deviceMap}
                  onAction={(action) => onAction(action, u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
