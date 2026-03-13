"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  MonitorSmartphone,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ScrollText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/components/layout/admin-sidebar-context";
import { useState } from "react";
import { LogoutConfirmDialog } from "./logout-confirm-dialog";
import { clearAuthCookies } from "@/lib/cookies";

/* ===== เมนูภาษาไทย ===== */

const navigation = [
  {
    name: "ภาพรวมระบบ",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "เครื่องที่ว่าง",
    href: "/admin/available",
    icon: Smartphone,
  },
  {
    name: "จัดการผู้ใช้",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "จัดการอุปกรณ์",
    href: "/admin/devices",
    icon: MonitorSmartphone,
  },
  {
    name: "Logs / Activity",
    href: "/admin/logs",
    icon: ScrollText,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen z-50",
        "bg-sidebar border-r border-sidebar-border",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* ================= Header ================= */}
        <div className="relative p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sidebar-primary/10">
              <MonitorSmartphone className="h-6 w-6 text-sidebar-primary" />
            </div>

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <h1 className="text-lg font-semibold text-sidebar-foreground">
                    Myreal-Phone
                  </h1>
                  <p className="text-xs text-muted-foreground">ระบบผู้ดูแล</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ===== Toggle Sidebar ===== */}
          <button
            onClick={toggle}
            className="
    absolute -right-3 top-6
    rounded-full p-1
    bg-blue-600 text-white
    border border-blue-700
    shadow-md
    transition-all duration-200
    hover:bg-blue-700
    hover:shadow-lg
    active:scale-95
  "
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ================= Navigation ================= */}
        <nav className="flex-1 p-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3",
                  "rounded-lg px-3 py-2.5",
                  "text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-0"
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
            );
          })}
        </nav>

        {/* ================= Logout ================= */}
        <div className="p-3 border-t-2 border-sidebar-border/100">
          <button
            onClick={() => setLogoutOpen(true)}
            className={cn(
              "w-full flex items-center gap-3",
              "px-3 py-2.5 rounded-xl",
              "text-sm font-semibold",
              "text-red-500 bg-red-500/10",
              "transition-all duration-200",
              "hover:bg-red-500 hover:text-white",
              "active:scale-[0.98]",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />

            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                >
                  ออกจากระบบ
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
      <LogoutConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          clearAuthCookies();
          window.location.href = "/login";
        }}
      />
    </aside>
  );
}
