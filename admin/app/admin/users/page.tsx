"use client";

import { useEffect, useMemo, useState } from "react";
import { UsersTable } from "@/components/users/user-table";
import { UsersService } from "@/services/users.service";
import { User, UserAction } from "@/types/user";
import { Button } from "@/components/ui/button";
import { UserPlus, Search } from "lucide-react";
import { UserCreateDialog } from "@/components/users/user-create-dialog";
import { UserAssignDeviceDialog } from "@/components/users/user-assign-device-dialog";
import { UserTimeDialog } from "@/components/users/user-time-dialog";
import { UserDeleteDialog } from "@/components/users/user-delete-dialog";
import { Input } from "@/components/ui/input";

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ current user
  const [me, setMe] = useState<User | null>(null);

  // ✅ Search
  const [searchInput, setSearchInput] = useState(""); // พิมพ์อยู่
  const [search, setSearch] = useState(""); // กด Enter แล้วค่อยใช้จริง

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);

  // assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<User | null>(null);

  // time dialog
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeUser, setTimeUser] = useState<User | null>(null);

  // delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

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
  }, []);

  // ✅ ฟังก์ชันยืนยันการค้นหา (Enter / Click 🔍)
  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  // ✅ ล้างค้นหา
  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
  };

  // ✅ filtered users (ทำงานเมื่อ search เปลี่ยนเท่านั้น)
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

      case "assign":
        setAssignUser(user);
        setAssignOpen(true);
        break;

      case "time":
        setTimeUser(user);
        setTimeOpen(true);
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

        <Button
          className="flex items-center gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          สร้างผู้ใช้
        </Button>
      </div>

      {/* ✅ Search Bar (กด Enter / กดปุ่ม 🔍 เท่านั้น) */}
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

          {/* ✅ ปุ่มแว่นขยาย */}
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
      />

      {/* ✅ Create User Dialog */}
      <UserCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchUsers}
      />

      {/* ✅ Assign Device Dialog */}
      <UserAssignDeviceDialog
        open={assignOpen}
        user={assignUser}
        onClose={() => {
          setAssignOpen(false);
          setAssignUser(null);
        }}
        onSuccess={fetchUsers}
      />

      {/* ✅ Add Time Dialog */}
      <UserTimeDialog
        open={timeOpen}
        user={timeUser}
        onClose={() => {
          setTimeOpen(false);
          setTimeUser(null);
        }}
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
