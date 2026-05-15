"use client";

import { useMemo, useState } from "react";
import { UsersTable } from "@/components/users/user-table";
import { UsersService } from "@/services/users.service";
import { User, UserAction } from "@/types/user";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, Clock } from "lucide-react";
import { UserCreateDialog } from "@/components/users/user-create-dialog";
import { UserDeleteDialog } from "@/components/users/user-delete-dialog";
import { Input } from "@/components/ui/input";

import { UserAssignDevicesTimeDialog } from "@/components/users/user-assign-devices-time-dialog";
import { UserBulkAddTimeDialog } from "@/components/users/user-bulk-add-time-dialog";
import { DevicesService } from "@/services/devices.service";
import { DeviceMini } from "@/components/users/user-table";

import useSWR from "swr";
import { HelpButton } from "@/components/help/help-button";
import { useToast } from "@/hooks/use-toast";

export default function UserManagementPage() {
  const { toast } = useToast();
  const { data: rawUsers, isLoading: isUsersLoading, mutate: mutateUsers } = useSWR('/api/users', () => UsersService.getAll(), { refreshInterval: 10000 });
  const { data: rawDevices, isLoading: isDevicesLoading, mutate: mutateDevices } = useSWR('/api/devices', () => DevicesService.getAll(), { refreshInterval: 10000 });
  const { data: meData } = useSWR('/api/users/me', () => UsersService.getMe());

  const loading = (isUsersLoading || isDevicesLoading) && !rawUsers && !rawDevices;

  const users: User[] = useMemo(() => {
    return (rawUsers || []).map((u: any) => ({
      ...u,
      id: u.id || u._id,
    }));
  }, [rawUsers]);

  const me: User | null = useMemo(() => {
    if (!meData) return null;
    return {
      ...(meData as any),
      id: (meData as any).id || (meData as any)._id,
    };
  }, [meData]);

  const devices: DeviceMini[] = useMemo(() => {
    return (rawDevices || []).map((d: any) => ({
      id: String(d._id || d.id).trim(),
      name: d.name || "Unnamed",
      serial_number: d.serial_number || "-",
    }));
  }, [rawDevices]);

  // sessions refresh key — incremented when bulk time ops complete
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);

  // ✅ Search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);

  // ✅ NEW: assign device+time dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<User | null>(null);

  // ✅ NEW: bulk add time
  const [bulkOpen, setBulkOpen] = useState(false);

  // delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  // ✅ ทำ map ไว้ lookup device name เร็วๆ
  const deviceMap = useMemo(() => {
    return devices.reduce((acc, d) => {
      // ใช้ d.id ซึ่งเราแปลงมาจาก _id แล้วใน fetchDevices
      const idStr = d.id?.toString();
      if (idStr) {
        acc[idStr] = d;
      }
      return acc;
    }, {} as Record<string, DeviceMini>);
  }, [devices]);

  const fetchUsers = async () => {
    await mutateUsers();
  };

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [users, search]);

  const handleAction = async (action: UserAction | "refresh", user: User) => {
    switch (action) {
      case "refresh" as any:
        await fetchUsers();
        break;

      case "delete": {
        if (me?.id && user.id === me.id) {
          toast({ variant: "destructive", title: "ไม่สามารถลบตัวเองได้", description: "Admin ไม่สามารถลบบัญชีตัวเองได้" });
          return;
        }
        setDeleteUser(user);
        setDeleteOpen(true);
        break;
      }

      case "disconnect":
        try {
          await UsersService.disconnectDevice(user.id);
          await fetchUsers();
          toast({ title: "ตัดการเชื่อมต่อแล้ว", description: `${user.name}` });
        } catch (e: any) {
          toast({ variant: "destructive", title: "ตัดการเชื่อมต่อไม่สำเร็จ", description: e?.message || "เกิดข้อผิดพลาด" });
        }
        break;

      case "assign":
      case "time":
        setAssignUser(user);
        setAssignOpen(true);
        break;
    }
  };

  if (loading) {
    return <div className="p-8">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-3xl font-semibold">การจัดการผู้ใช้</h1>
          <HelpButton topic="users" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* ✅ Bulk Add Time */}
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setBulkOpen(true)}
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">เพิ่มเวลาให้คนที่กำลังใช้งาน</span>
            <span className="sm:hidden">เพิ่มเวลา</span>
          </Button>

          {/* Create User */}
          <Button
            className="flex items-center gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            สร้างผู้ใช้
          </Button>
        </div>
      </div>

      {/* ✅ Search Bar */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาชื่อผู้ใช้ / username..."
            className="pr-12"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />

          <button
            type="button"
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 hover:bg-muted"
            title="ค้นหา"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {(searchInput.trim() !== "" || search.trim() !== "") && (
          <Button variant="outline" onClick={handleClearSearch}>
            ล้าง
          </Button>
        )}
      </div>

      {/* ✅ Table */}
      <UsersTable
        users={filteredUsers}
        currentUserId={me?.id || null}
        onAction={handleAction}
        deviceMap={deviceMap}
        externalRefreshKey={sessionsRefreshKey}
      />

      {/* ✅ Create User Dialog */}
      <UserCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchUsers}
      />

      {/* ✅ NEW: Assign Devices + Time Dialog */}
      <UserAssignDevicesTimeDialog
        open={assignOpen}
        user={assignUser}
        onClose={() => {
          setAssignOpen(false);
          setAssignUser(null);
        }}
        onSuccess={() => {
          fetchUsers();
          setSessionsRefreshKey((k) => k + 1);
        }}
      />

      {/* ✅ NEW: Bulk Add Time Dialog */}
      <UserBulkAddTimeDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={() => {
          fetchUsers();
          setSessionsRefreshKey((k) => k + 1);
        }}
      />

      {/* ✅ Delete Dialog */}
      <UserDeleteDialog
        open={deleteOpen}
        user={deleteUser}
        onClose={() => setDeleteOpen(false)}
        onDeleted={fetchUsers}
      />
    </div>
  );
}
