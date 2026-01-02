"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Smartphone,
  Users,
  MonitorSmartphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

/* ===== เมนูภาษาไทย ===== */

const navigation = [
  { name: "ภาพรวมระบบ", href: "/admin", icon: LayoutDashboard },
  { name: "เครื่องที่ว่าง", href: "/admin/available", icon: Smartphone },
  { name: "จัดการผู้ใช้", href: "/admin/users", icon: Users },
  { name: "จัดการอุปกรณ์", href: "/admin/devices", icon: MonitorSmartphone },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="flex flex-col h-full">
        {/* ===== Header ===== */}
        <div className="relative p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sidebar-primary/10">
              <MonitorSmartphone className="h-6 w-6 text-sidebar-primary" />
            </div>

            {!collapsed && (
              <div>
                <h1 className="text-lg font-semibold text-sidebar-foreground">
                  Myreal-Phone
                </h1>
                <p className="text-xs text-muted-foreground">
                  ระบบผู้ดูแล
                </p>
              </div>
            )}
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 bg-sidebar border border-sidebar-border rounded-full p-1 shadow"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ===== Navigation ===== */}
        <nav className="flex-1 p-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  collapsed && "justify-center px-0",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        {/* ===== Footer ===== */}
        <div className="p-3 border-t border-sidebar-border">
          <Link
            href="/login"
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors",
              collapsed && "justify-center px-0",
            )}
          >
            🚪
            {!collapsed && "ออกจากระบบ"}
          </Link>
        </div>
      </div>
    </aside>
  )
}
