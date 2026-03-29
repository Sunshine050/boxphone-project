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
  CircleHelp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/components/layout/admin-sidebar-context";
import { useState } from "react";
import { LogoutConfirmDialog } from "./logout-confirm-dialog";
import { AuthService } from "@/services/auth.service";
import { clearAuthCookies } from "@/lib/cookies";
import { HelpSheet } from "@/components/help/help-sheet";

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
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebar();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ================= Header ================= */}
      <div className="relative p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sidebar-primary/10">
            <MonitorSmartphone className="h-6 w-6 text-sidebar-primary" />
          </div>

          <AnimatePresence>
            {(!collapsed || mobileOpen) && (
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

        {/* ===== Toggle Sidebar (desktop only) ===== */}
        <button
          onClick={toggle}
          className="
            hidden md:flex
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
              onClick={closeMobile}
              className={cn(
                "flex items-center gap-3",
                "rounded-lg px-3 py-2.5",
                "text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                collapsed && !mobileOpen && "md:justify-center md:px-0"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />

              <AnimatePresence>
                {(!collapsed || mobileOpen) && (
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

      {/* ================= Help + Logout ================= */}
      <div className="p-3 border-t-2 border-sidebar-border/100 space-y-1">
        <button
          onClick={() => setHelpOpen(true)}
          className={cn(
            "w-full flex items-center gap-3",
            "px-3 py-2.5 rounded-xl",
            "text-sm font-medium",
            "text-muted-foreground",
            "transition-all duration-200",
            "hover:bg-accent hover:text-foreground",
            "active:scale-[0.98]",
            collapsed && !mobileOpen && "md:justify-center md:px-0"
          )}
        >
          <CircleHelp className="h-5 w-5 shrink-0" />

          <AnimatePresence>
            {(!collapsed || mobileOpen) && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
              >
                ช่วยเหลือ
              </motion.span>
            )}
          </AnimatePresence>
        </button>

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
            collapsed && !mobileOpen && "md:justify-center md:px-0"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />

          <AnimatePresence>
            {(!collapsed || mobileOpen) && (
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
  );

  return (
    <>
      {/* ===== Mobile overlay backdrop ===== */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* ===== Desktop sidebar ===== */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen z-50",
          "bg-sidebar border-r border-sidebar-border",
          "transition-all duration-300 ease-in-out",
          "hidden md:block",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {sidebarContent}
        <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} topic="workflow" />
        <LogoutConfirmDialog
          open={logoutOpen}
          onClose={() => setLogoutOpen(false)}
          onConfirm={async () => {
            try { await AuthService.logout(); } catch {}
            clearAuthCookies();
            window.location.replace("/login");
          }}
        />
      </aside>

      {/* ===== Mobile drawer sidebar ===== */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen z-50 w-64",
          "bg-sidebar border-r border-sidebar-border",
          "transition-transform duration-300 ease-in-out",
          "md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
        <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} topic="workflow" />
        <LogoutConfirmDialog
          open={logoutOpen}
          onClose={() => setLogoutOpen(false)}
          onConfirm={async () => {
            try { await AuthService.logout(); } catch {}
            clearAuthCookies();
            window.location.replace("/login");
          }}
        />
      </aside>
    </>
  );
}
