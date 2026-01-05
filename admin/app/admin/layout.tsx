import type React from "react"
import { SidebarProvider } from "@/components/layout/admin-sidebar-context"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { AdminLayoutClient } from "./layout-client"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AdminLayoutClient>
        <AdminSidebar />
        {children}
      </AdminLayoutClient>
    </SidebarProvider>
  )
}
