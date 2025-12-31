"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Smartphone, Users, MonitorSmartphone } from "lucide-react"
import { motion } from "framer-motion"

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Available Devices", href: "/admin/available", icon: Smartphone },
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "Device Management", href: "/admin/devices", icon: MonitorSmartphone },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
}

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex flex-col h-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-6 border-b border-sidebar-border"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sidebar-primary/10">
              <MonitorSmartphone className="h-6 w-6 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">CloudPhone</h1>
              <p className="text-xs text-muted-foreground">Admin Control</p>
            </div>
          </div>
        </motion.div>

        <motion.nav variants={container} initial="hidden" animate="show" className="flex-1 p-4 space-y-1">
          {navigation.map((navItem) => {
            const isActive = pathname === navItem.href
            return (
              <motion.div key={navItem.name} variants={item}>
                <Link
                  href={navItem.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <navItem.icon className="h-5 w-5" />
                  {navItem.name}
                </Link>
              </motion.div>
            )
          })}
        </motion.nav>

        <div className="p-4 border-t border-sidebar-border">
          <Link
            href="/login"
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign Out
          </Link>
        </div>
      </div>
    </aside>
  )
}
