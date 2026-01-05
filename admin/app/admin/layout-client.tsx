"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/layout/admin-sidebar-context"

export function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const { collapsed } = useSidebar()

  return (
    <div className="flex min-h-screen bg-background">
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "ml-20" : "ml-64",
        )}
      >
        {children}
      </main>
    </div>
  )
}
