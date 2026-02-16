"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Smartphone, LogOut } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { getNotificationSocket } from "@/lib/socket-client"
import { toast } from "sonner"
import { NotificationBell } from "./notification-bell"

interface Session {
  _id: string
  status: "ACTIVE" | "PAUSED" | "EXPIRED"
  start_time: string
  resume_time?: string
  remaining_seconds: number
  device_id: {
    name: string
  }
}

export function SessionDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [selected, setSelected] = useState<Session | null>(null)

  // 1. โหลดข้อมูลแจ้งเตือน (Logic เดิม)
  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) return
    try {
      const userData = JSON.parse(userStr)
      const userId = userData.id
      if (!userId) return

      const socket = getNotificationSocket(userId)
      socket.on("new_notification", (data: any) => {
        toast[data.type === 'WARNING' ? 'error' : 'success'](data.title, {
          description: data.message,
          duration: 5000,
        })
      })
      return () => { socket.disconnect() }
    } catch (e) { console.error(e) }
  }, [])

  // 2. โหลด Session จาก Server (ดึงค่า remaining_seconds ที่คำนวณมาแล้ว)
  const loadSessions = async () => {
    try {
      const data = await apiFetch<Session[] | null>("/sessions/me")
      const list = data ?? []
      setSessions(list)
      if (!selected && list.length > 0) setSelected(list[0])
    } catch {
      router.push("/login")
    }
  }

  useEffect(() => {
    loadSessions()
  }, [router])

  // 🎯 3. UI Timer: นับถอยหลังในใจทีละ -1 วินาที
  // วิธีนี้จะทำให้เวลาเดินลื่นไหล และไม่หักลบเวลาซ้ำซ้อนกับ Server
  useEffect(() => {
    const timer = setInterval(() => {
      setSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (s.status === "ACTIVE" && s.remaining_seconds > 0) {
            return {
              ...s,
              remaining_seconds: s.remaining_seconds - 1,
            }
          }
          return s
        })
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 4. แสดงผลเวลา
  const getRemaining = (s: Session) => {
    const remaining = Math.max(0, s.remaining_seconds)
    return {
      minutes: Math.floor(remaining / 60),
      seconds: remaining % 60,
      expired: remaining <= 0,
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">CloudPhone Devices</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button variant="outline" onClick={handleLogout} className="border-slate-700 hover:bg-slate-800">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-10 text-center text-slate-400">
              No active sessions assigned
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* List */}
            <div className="w-full md:w-72 space-y-3">
              {sessions.map((s) => {
                const { minutes, seconds, expired } = getRemaining(s)
                const isActive = selected?._id === s._id
                return (
                  <div
                    key={s._id}
                    onClick={() => setSelected(s)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isActive ? 'border-cyan-500 bg-slate-800' : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                    }`}
                  >
                    <p className="font-semibold truncate">{s.device_id.name}</p>
                    {!expired ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-4 w-4 text-cyan-400" />
                        <span className="font-mono text-cyan-400 text-lg">
                          {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
                        </span>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Live</Badge>
                      </div>
                    ) : (
                      <span className="text-red-400 text-sm mt-2 block">Expired</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Detail */}
            {selected && (
              <Card className="flex-1 bg-slate-900/70 border-slate-800">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">{selected.device_id.name}</h2>
                      <p className="text-slate-400">Ready for remote access</p>
                    </div>
                    <Smartphone className="h-12 w-12 text-slate-700" />
                  </div>
                  <Button
                    onClick={() => router.push(`/control/${selected._id}`)}
                    className="w-full md:w-auto px-8 py-6 text-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                  >
                    <Smartphone className="mr-2 h-5 w-5" />
                    Open Full Control
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}