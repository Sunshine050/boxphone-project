"use client"

import { useEffect, useState, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { getNotificationSocket } from "@/lib/socket-client"

interface Notification {
  _id: string
  title: string
  message: string
  type: "INFO" | "WARNING" | "SUCCESS" | "DANGER"
  is_read: boolean
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  const socketRef = useRef<any>(null)

  /* ================= LOAD NOTIFICATIONS ================= */

  const loadNotis = async () => {
    try {
      const data = await apiFetch<Notification[]>("/notifications/me")
      if (Array.isArray(data)) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    } catch (err) {
      console.error("Failed to load notifications:", err)
    }
  }

  /* ================= SOCKET + INITIAL LOAD ================= */

  useEffect(() => {
    setMounted(true)

    const userId = localStorage.getItem("user")
    if (!userId) return

    loadNotis()

    if (!socketRef.current) {
      socketRef.current = getNotificationSocket(userId)
    }

    const socket = socketRef.current

    const handler = (data: Notification) => {

      setNotifications(prev => [data, ...prev])
      setUnreadCount(prev => prev + 1)
    }

    socket.on("new_notification", handler)

    return () => {
      socket.off("new_notification", handler)
    }
  }, [])

  /* ================= MARK ONE READ ================= */

  const markOneRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "POST" })

      setNotifications(prev =>
        prev.map(n =>
          n._id === id ? { ...n, is_read: true } : n
        )
      )

      setUnreadCount(prev => Math.max(prev - 1, 0))
    } catch (err) {
      console.error("markOneRead failed", err)
    }
  }

  /* ================= MARK ALL READ ================= */

  const markAllRead = async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "POST" })

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )

      setUnreadCount(0)
    } catch (err) {
      console.error("markAllRead failed", err)
    }
  }

  /* ================= HANDLE OPEN ================= */

  const handleOpenChange = (open: boolean) => {
    if (open) {
      markAllRead()
    }
  }

  /* ================= SSR GUARD ================= */

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5 text-slate-400" />
      </Button>
    )
  }

  /* ================= UI (ไม่แตะ layout เดิม) ================= */

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-slate-400" />

          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 border-2 border-slate-950 text-[10px] font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 bg-slate-900 border-slate-800 p-0 shadow-2xl"
        align="end"
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h4 className="text-sm font-semibold text-white">Notifications</h4>
          {notifications.length > 0 && (
            <span className="text-[10px] text-slate-500">
              {notifications.length} messages
            </span>
          )}
        </div>

        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-500">
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.map((n, index) => (
              <div
                key={`${n._id}-${index}`}
                onClick={() => !n.is_read && markOneRead(n._id)}
                className={`p-4 cursor-pointer border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors ${!n.is_read ? "bg-blue-500/5" : ""}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${n.type === "WARNING" || n.type === "DANGER"
                        ? "text-red-400"
                        : n.type === "SUCCESS"
                          ? "text-green-400"
                          : "text-cyan-400"
                      }`}
                  >
                    {n.title}
                  </p>

                  {!n.is_read && (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {n.message}
                </p>

                <p className="text-[10px] text-slate-500 mt-2 font-mono">
                  {new Date(n.createdAt).toLocaleString("th-TH")}
                </p>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}