"use client";

import { useEffect, useMemo, useState } from "react";
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


export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ current user
  const [me, setMe] = useState<User | null>(null);

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
  // ✅ devices list (เอาไว้แปลง id -> name)
  const [devices, setDevices] = useState<DeviceMini[]>([]);

  // ✅ ทำ map ไว้ lookup device name เร็วๆ
  const deviceMap = useMemo(() => {
    return devices.reduce((acc, d) => {
      acc[d.id] = d;
      return acc;
    }, {} as Record<string, DeviceMini>);
  }, [devices]);

  // ✅ fetch devices จาก backend
  const fetchDevices = async () => {
    try {
      const data = (await DevicesService.getAll()) as any[];

      setDevices(
        data.map((d) => ({
          id: d.id || d._id,
          name: d.name,
          serial_number: d.serial_number,
        }))
      );
    } catch (e) {
      console.error("fetchDevices failed:", e);
      setDevices([]);
    }
  };


  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data: any[] = await UsersService.getAll();

      setUsers(
        data.map((u) => ({
          ...u,
          id: u.id || u._id,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      const data: any = await UsersService.getMe();
      setMe({
        ...data,
        id: data.id || data._id,
      });
    } catch (e) {
      console.error("fetchMe failed:", e);
      setMe(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMe();
    fetchDevices();
  }, []);

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

  const handleAction = async (action: UserAction, user: User) => {
    switch (action) {
      case "delete": {
        if (me?.id && user.id === me.id) {
          alert("Admin ไม่สามารถลบตัวเองได้");
          return;
        }
        setDeleteUser(user);
        setDeleteOpen(true);
        break;
      }

      case "disconnect":
        await UsersService.disconnectDevice(user.id);
        await fetchUsers();
        break;

      // ✅ รวม assign + time เป็นปุ่มเดียว
      case "assign":
        setAssignUser(user);
        setAssignOpen(true);
        break;

      // ✅ เผื่อมี code เก่าเรียก "time" อยู่
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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold">การจัดการผู้ใช้</h1>

        <div className="flex items-center gap-2">
          {/* ✅ Bulk Add Time */}
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setBulkOpen(true)}
          >
            <Clock className="w-4 h-4" />
            เพิ่มเวลาให้คนที่กำลังใช้งาน
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
        onSuccess={fetchUsers}
      />

      {/* ✅ NEW: Bulk Add Time Dialog */}
      <UserBulkAddTimeDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={fetchUsers}
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
