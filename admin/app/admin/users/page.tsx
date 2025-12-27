"use client"

import { UsersTable } from "@/components/users-table"
import { motion } from "framer-motion"

export default function UserManagementPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and sessions</p>
        </div>
      </div>

      <UsersTable />
    </motion.div>
  )
}
