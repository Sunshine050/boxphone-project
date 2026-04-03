"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { getNotificationSocket } from "@/lib/socket-client"
import { playNotificationSound } from "@/lib/notification-sound"
import { toast } from "sonner"
import { SessionDashboard } from "@/components/session-dashboard"

// Interface สำหรับข้อมูล Session
export interface Session {
  _id: string
  status: "ACTIVE" | "PAUSED" | "EXPIRED"
  start_time: string
  resume_time?: string
  remaining_seconds: number
  device_id: {
    _id: string
    name: string
    serial_number: string
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(Date.now())
  const [loading, setLoading] = useState(true)

  // 1. ฟังก์ชันโหลดข้อมูลจาก Server
  const loadSessions = useCallback(async () => {
    try {
      const data = await apiFetch<Session[] | null>("/sessions/me")
      setSessions(data ?? [])
      setLastSyncTimestamp(Date.now())
      setLoading(false)
    } catch {
      router.push("/login")
    }
  }, [router])

  // 2. Initial Load & Socket: แจ้งเตือน real-time + เสียง, session_updated ให้รีเฟรชโดยไม่ต้อง reload
  useEffect(() => {
    loadSessions()

    let cancelled = false
    let socket: ReturnType<typeof getNotificationSocket> | null = null

    apiFetch<{ user: { id: string; username: string; role: string } }>("/auth/me")
      .then((res) => {
        if (cancelled || !res.user?.id) return
        const tokenMatch = document.cookie
          .split("; ")
          .find((row) => row.startsWith("access_token="))
        const token = tokenMatch?.split("=")[1]
        if (!token) return

        socket = getNotificationSocket(token)

        socket.on("new_notification", (data: any) => {
          playNotificationSound()
          toast[data.type === "WARNING" || data.type === "DANGER" ? "error" : "success"](data.title ?? "แจ้งเตือน", {
            description: data.message,
            duration: 5000,
          })
        })

        socket.on("session_updated", () => {
          loadSessions()
        })
      })
      .catch((e) => {
        console.error("Socket init error:", e)
      })

    return () => {
      cancelled = true
      if (socket) {
        socket.off("new_notification")
        socket.off("session_updated")
        socket.disconnect()
      }
    }
  }, [loadSessions])

  // 3. แก้บัคจอดับ: Sync ทันทีที่กลับมาเปิดหน้าจอ
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadSessions()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [loadSessions])

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>
  }

  return (
    <SessionDashboard
      initialSessions={sessions}
      lastSyncTimestamp={lastSyncTimestamp}
      refreshData={loadSessions}
    />
  )
}