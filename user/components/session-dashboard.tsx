"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Smartphone, LogOut } from "lucide-react"
import { NotificationBell } from "./notification-bell"
import { Session } from "@/app/dashboard/page"
import { escapeHtml } from "@/lib/sanitize"
import { AuthService } from "@/services/auth.service"

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

interface DashboardProps {
  initialSessions: Session[]
  lastSyncTimestamp: number
  refreshData: () => Promise<void>
}

export function SessionDashboard({
  initialSessions,
  lastSyncTimestamp,
  refreshData,
}: DashboardProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [selected, setSelected] = useState<Session | null>(
    initialSessions[0] || null
  )
  const [lastSync, setLastSync] = useState(lastSyncTimestamp)
  const [, setTick] = useState(0)

  /* ================= SYNC เมื่อ parent ส่ง initialSessions ใหม่ (real-time จาก session_updated) ================= */

  useEffect(() => {
    setSessions(initialSessions)
    setLastSync(lastSyncTimestamp)
    setSelected((prev) => {
      if (initialSessions.length === 0) return null
      const stillExists = prev && initialSessions.some((s) => s._id === prev._id)
      return stillExists ? prev : initialSessions[0] || null
    })
  }, [initialSessions, lastSyncTimestamp])

  /* ================= HEARTBEAT ================= */

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  /* ================= TIME ================= */

  const getRemaining = (s: Session) => {
    let remaining = s.remaining_seconds

    if (s.status === "ACTIVE") {
      const secondsElapsedSinceSync = Math.floor(
        (Date.now() - lastSync) / 1000
      )
      remaining = Math.max(
        0,
        s.remaining_seconds - secondsElapsedSinceSync
      )
    }

    return {
      minutes: Math.floor(remaining / 60),
      seconds: remaining % 60,
      expired: remaining <= 0,
    }
  }

  /* ================= LOGOUT ================= */

  const handleLogout = () => {
    AuthService.logout()
    router.push("/login")
  }

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="container mx-auto p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">CloudPhone Devices</h1>

          <div className="flex items-center gap-4">
            <NotificationBell />

            {/* ===== LOGOUT DIALOG ===== */}
            {/* ===== LOGOUT DIALOG ===== */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-700 hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  ออกจากระบบ
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>
                    ยืนยันการออกจากระบบ
                  </DialogTitle>
                </DialogHeader>

                <p className="text-slate-400 text-sm mt-2">
                  คุณต้องการออกจากระบบใช่หรือไม่?
                  หากออกจากระบบแล้ว จะต้องเข้าสู่ระบบใหม่อีกครั้ง
                </p>

                <DialogFooter className="mt-6 flex gap-3">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-slate-600 hover:bg-slate-800">
                      ยกเลิก
                    </Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                  >
                    ออกจากระบบ
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </div>

        {/* EMPTY */}
        {sessions.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-10 text-center text-slate-400">
              No active sessions assigned
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">

            {/* LEFT LIST */}
            <div className="w-full md:w-72 space-y-3">
              {sessions.map((s) => {
                const { minutes, seconds, expired } =
                  getRemaining(s)

                const isActive = selected?._id === s._id

                return (
                  <div
                    key={s._id}
                    onClick={() => setSelected(s)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${isActive
                        ? "border-cyan-500 bg-slate-800"
                        : "border-slate-800 bg-slate-900/70 hover:border-slate-600"
                      }`}
                  >
                    <p className="font-semibold truncate" title={escapeHtml(s.device_id?.name)}>
                      {s.device_id?.name}
                    </p>

                    {!expired ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-4 w-4 text-cyan-400" />
                        <span className="font-mono text-cyan-400 text-lg">
                          {minutes.toString().padStart(2, "0")}:
                          {seconds.toString().padStart(2, "0")}
                        </span>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          Live
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-red-400 text-sm mt-2 block">
                        Expired
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* RIGHT DETAIL */}
            {selected && (
              <Card className="flex-1 bg-slate-900/70 border-slate-800">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2" title={escapeHtml(selected.device_id?.name)}>
                        {selected.device_id?.name}
                      </h2>
                      <p className="text-slate-400">
                        Ready for remote access
                      </p>
                    </div>
                    <Smartphone className="h-12 w-12 text-slate-700" />
                  </div>

                  <Button
                    onClick={() =>
                      router.push(`/control/${selected._id}`)
                    }
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