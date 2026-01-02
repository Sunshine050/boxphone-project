import type React from "react"
import { AdminSidebar } from "@/components/admin-sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      {/* ใช้ pl แทน ml เพื่อให้ responsive */}
      <main className="flex-1 pl-64 transition-all duration-300 data-[collapsed=true]:pl-20">
        {children}
      </main>
    </div>
  )
}
