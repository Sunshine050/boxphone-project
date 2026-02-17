"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { getNotificationSocket } from "@/lib/socket-client"
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
    name: string
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

  // 2. Initial Load & Socket Notification
  useEffect(() => {
    loadSessions()

    const userStr = localStorage.getItem("user")
    if (!userStr) return
    try {
      const userData = JSON.parse(userStr)
      const userId = userData.id
      if (userId) {
        const socket = getNotificationSocket(userId)
        socket.on("new_notification", (data: any) => {
          toast[data.type === 'WARNING' ? 'error' : 'success'](data.title, {
            description: data.message,
            duration: 5000,
          })
        })
        return () => { socket.disconnect() }
      }
    } catch (e) { console.error("Socket error:", e) }
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