"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Smartphone, LogOut } from "lucide-react"
import { apiFetch } from "@/lib/api"

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
  const [now, setNow] = useState(Date.now())

  /* =====================
     LOAD FROM BACKEND
  ===================== */
  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<Session[] | null>("/sessions/me")
        const list = data ?? []
        setSessions(list)
        setSelected(list[0] ?? null)
      } catch {
        router.push("/login")
      }
    }

    load()
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [router])

  /* =====================
     TIME CALC
  ===================== */
  const getRemaining = (s: Session) => {
    let remaining = s.remaining_seconds

    if (s.status === "ACTIVE") {
      const base = new Date(s.resume_time ?? s.start_time).getTime()
      const elapsed = Math.floor((now - base) / 1000)
      remaining = Math.max(0, s.remaining_seconds - elapsed)
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

  const openSession = (id: string) => {
    router.push(`/control/${id}`)
  }

  /* =====================
     UI (UNCHANGED STYLE)
  ===================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">CloudPhone Devices</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {sessions.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-10 text-center text-slate-400">
              No active sessions assigned by admin
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-6">
            {/* LEFT */}
            <div className="w-72 space-y-3">
              {sessions.map((s) => {
                const { minutes, seconds, expired } = getRemaining(s)

                return (
                  <div
                    key={s._id}
                    onClick={() => setSelected(s)}
                    className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/70 p-4 hover:border-cyan-500"
                  >
                    <p className="text-white font-semibold truncate">
                      {s.device_id.name}
                    </p>

                    {!expired ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-4 w-4 text-cyan-400" />
                        <span className="font-mono text-cyan-400">
                          {minutes.toString().padStart(2, "0")}:
                          {seconds.toString().padStart(2, "0")}
                        </span>
                        <Badge className="bg-green-500/20 text-green-400">
                          Live
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-red-400 text-sm">Expired</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* RIGHT */}
            {selected && (
              <Card className="flex-1 bg-slate-900/70 border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-xl text-white mb-2">
                    {selected.device_id.name}
                  </h2>
                  <Button
                    onClick={() => openSession(selected._id)}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600"
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
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
