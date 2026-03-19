"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Bell, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { getNotificationSocket } from "@/lib/socket-client"
import { playNotificationSound } from "@/lib/notification-sound"
import {
  NotificationService,
  type Notification,
} from "@/services/notification.service"
import { apiFetch } from "@/lib/api"

const PAGE_SIZE = 10

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  const socketRef = useRef<any>(null)

  const loadNotis = useCallback(async (pageNum: number = 1) => {
    setLoading(true)
    try {
      const res = await NotificationService.getPage(pageNum, PAGE_SIZE)
      if (res?.items) {
        setNotifications(res.items)
        setTotal(res.total)
        setPage(res.page)
        if (typeof res.totalUnread === "number") setUnreadCount(res.totalUnread)
        else setUnreadCount(res.items.filter((n) => !n.is_read).length)
      }
    } catch (err) {
      console.error("Failed to load notifications:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    let cancelled = false

    loadNotis(1)

    apiFetch<{ user: { id: string } }>("/auth/me")
      .then((res) => {
        if (cancelled || !res.user?.id) return
        const userId = res.user.id

        if (!socketRef.current) {
          socketRef.current = getNotificationSocket(userId)
        }

        const socket = socketRef.current

        const handler = () => {
          playNotificationSound()
          loadNotis(page)
        }

        socket.on("new_notification", handler)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (socketRef.current) {
        socketRef.current.off("new_notification")
      }
    }
  }, [loadNotis, page])

  const markOneRead = async (id: string) => {
    try {
      await NotificationService.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(prev - 1, 0))
    } catch (err) {
      console.error("markOneRead failed", err)
    }
  }

  const markAllRead = async () => {
    try {
      await NotificationService.markAll()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error("markAllRead failed", err)
    }
  }

  const deleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const wasUnread = notifications.find((n) => n._id === id)?.is_read === false
    try {
      await NotificationService.delete(id)
      const nextTotal = Math.max(0, total - 1)
      setTotal(nextTotal)
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1))
      const remaining = notifications.filter((n) => n._id !== id)
      setNotifications(remaining)
      const totalPagesNow = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE))
      if (remaining.length === 0 && page > 1 && totalPagesNow >= 1) {
        loadNotis(Math.min(page - 1, totalPagesNow))
      }
    } catch (err) {
      console.error("delete notification failed", err)
    }
  }

  const clearAll = async () => {
    try {
      await NotificationService.clearAll()
      setNotifications([])
      setTotal(0)
      setUnreadCount(0)
      setPage(1)
    } catch (err) {
      console.error("clearAll failed", err)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      loadNotis(page)
      markAllRead()
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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
        <div className="p-4 border-b border-slate-800 flex justify-between items-center flex-wrap gap-2">
          <h4 className="text-sm font-semibold text-white">Notifications</h4>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="text-[10px] text-slate-500">
                {total} รายการ
              </span>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-slate-400 hover:text-red-400"
                onClick={clearAll}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                เคลียร์ทั้งหมด
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[320px]">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">กำลังโหลด...</div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-500">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n, index) => (
              <div
                key={`${n._id}-${index}`}
                onClick={() => !n.is_read && markOneRead(n._id)}
                className={`group relative p-4 cursor-pointer border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors ${!n.is_read ? "bg-blue-500/5" : ""}`}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                  onClick={(e) => deleteOne(n._id, e)}
                  title="ลบ"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <div className="flex justify-between items-start mb-1 pr-8">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      n.type === "WARNING" || n.type === "DANGER"
                        ? "text-red-400"
                        : n.type === "SUCCESS"
                          ? "text-green-400"
                          : "text-cyan-400"
                    }`}
                  >
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">
                  {new Date(n.createdAt).toLocaleString("th-TH")}
                </p>
              </div>
            ))
          )}
        </ScrollArea>

        {totalPages > 1 && (
          <div className="p-2 border-t border-slate-800">
            <Pagination>
              <PaginationContent className="flex flex-wrap justify-center gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (page > 1) loadNotis(page - 1)
                    }}
                    className={
                      page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 text-xs text-slate-500">
                    หน้า {page} / {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (page < totalPages) loadNotis(page + 1)
                    }}
                    className={
                      page >= totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}