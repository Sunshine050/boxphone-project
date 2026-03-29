"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/layout/admin-sidebar-context"
import { Menu } from "lucide-react"

export function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const { collapsed, toggleMobile } = useSidebar()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile top bar with hamburger */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-background border-b border-border md:hidden">
        <button
          onClick={toggleMobile}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          aria-label="เปิดเมนู"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold">Myreal-Phone Admin</span>
      </div>

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          "pt-14 md:pt-0",
          collapsed ? "md:ml-20" : "md:ml-64",
        )}
      >
        {children}
      </main>
    </div>
  )
}
