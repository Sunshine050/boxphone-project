"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Smartphone, LogOut, Maximize2 } from "lucide-react"
import { NotificationBell } from "./notification-bell"
import { Session } from "@/app/dashboard/page"

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/$/, "")

interface DashboardProps {
  initialSessions: Session[]
  lastSyncTimestamp: number
  refreshData: () => Promise<void>
}

/* ==============================
   PHONE THUMBNAIL (mini preview)
============================== */
function PhoneThumbnail({ deviceId }: { deviceId: string }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token || !deviceId) return

    fetch(`${BASE_URL}/devices/${deviceId}/screenshot`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error("screenshot failed")
        return r.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        setImgSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        setImgError(false)
      })
      .catch(() => setImgError(true))
  }, [deviceId])

  useEffect(() => {
    refresh()
    timerRef.current = setInterval(refresh, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (imgSrc) URL.revokeObjectURL(imgSrc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative w-full aspect-[9/19.5] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-lg">
      {imgSrc && !imgError ? (
        <img src={imgSrc} alt="phone screen" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {imgError ? (
            <Smartphone className="h-8 w-8 text-slate-600" />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          )}
        </div>
      )}
      {/* LIVE dot */}
      {!imgError && imgSrc && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] text-green-400 font-semibold leading-none">LIVE</span>
        </div>
      )}
    </div>
  )
}

/* ==============================
   MAIN DASHBOARD
============================== */
export function SessionDashboard({ initialSessions, lastSyncTimestamp, refreshData }: DashboardProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Session | null>(initialSessions[0] || null)
  const [, setTick] = useState(0)

  // UI Heartbeat สั่งให้ UI Re-render ทุกวินาทีเพื่อให้ตัวเลขขยับ
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // ฟังก์ชันคำนวณเวลาที่เหลือจากข้อมูลล่าสุดที่ Page ส่งมาให้
  const getRemaining = (s: Session) => {
    let remaining = s.remaining_seconds
    if (s.status === "ACTIVE") {
      const secondsElapsedSinceSync = Math.floor((Date.now() - lastSyncTimestamp) / 1000)
      remaining = Math.max(0, s.remaining_seconds - secondsElapsedSinceSync)
    }
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

        {initialSessions.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-400">
            ยังไม่มีอุปกรณ์ที่ได้รับมอบหมาย กรุณาติดต่อแอดมิน
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">

            {/* LEFT: SESSION LIST */}
            <div className="w-full md:w-64 space-y-3 flex-shrink-0">
              {initialSessions.map((s) => {
                const { minutes, seconds, expired } = getRemaining(s)
                const isActive = selected?._id === s._id
                return (
                  <div
                    key={s._id}
                    onClick={() => setSelected(s)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${isActive ? "border-cyan-500 bg-slate-800" : "border-slate-800 bg-slate-900/70 hover:border-slate-600"
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

            {/* RIGHT: DEVICE DETAIL + LIVE PREVIEW */}
            {selected && (() => {
              const { minutes, seconds, expired } = getRemaining(selected)
              return (
                <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col md:flex-row gap-6">

                  {/* Phone thumbnail */}
                  <div className="w-full md:w-40 flex-shrink-0">
                    <PhoneThumbnail deviceId={selected.device_id._id} />
                  </div>

                  {/* Info + actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{selected.device_id.name}</h2>
                      {!expired ? (
                        <div className="flex items-center gap-2 mb-4">
                          <Clock className="h-5 w-5 text-cyan-400" />
                          <span className="font-mono text-3xl font-bold text-cyan-400">
                            {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
                          </span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">LIVE</Badge>
                        </div>
                      ) : (
                        <p className="text-red-400 mb-4">หมดเวลาใช้งาน</p>
                      )}
                      <p className="text-slate-400 text-sm">คลิก "เปิดหน้าจอเต็ม" เพื่อดูภาพหน้าจอขนาดใหญ่</p>
                    </div>

                    <Button
                      onClick={() => router.push(`/control/${selected._id}`)}
                      disabled={expired}
                      className="mt-4 w-full md:w-auto px-6 py-5 text-base bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40"
                    >
                      <Maximize2 className="mr-2 h-5 w-5" />
                      เปิดหน้าจอเต็ม
                    </Button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}