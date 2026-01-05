"use client"

import { useState } from "react"
import { UsersTable } from "@/components/users/user-table"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"
import { UserCreateDialog } from "@/components/users/user-create-dialog"

export default function UserManagementPage() {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-8 space-y-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              การจัดการผู้ใช้
            </h1>
            <p className="text-muted-foreground">
              จัดการบัญชีผู้ใช้และเซสชัน
            </p>
          </div>

          {/* Create User Button (มุมขวาบน) */}
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2  cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            สร้างผู้ใช้
          </Button>
        </div>

        <UsersTable />
      </motion.div>

      {/* Dialog */}
      <UserCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  )
}
