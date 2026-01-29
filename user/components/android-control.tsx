"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Smartphone, Clock } from "lucide-react"

interface Session {
  _id: string
  status: "ACTIVE" | "PAUSED" | "EXPIRED"
  start_time: string
  resume_time?: string
  remaining_seconds: number
  device_id: {
    _id: string
    name: string
  }
}

export function AndroidControl() {
  const router = useRouter()
  const { sessionId } = useParams<{ sessionId: string }>()

  const [session, setSession] = useState<Session | null>(null)
  const [now, setNow] = useState(Date.now())

  /* =====================
     LOAD SESSION FROM SERVER
  ===================== */
  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<Session[] | null>("/sessions/me")
        const found = data?.find((s) => s._id === sessionId)

        if (!found) {
          router.push("/dashboard")
          return
        }

        setSession(found)
      } catch {
        router.push("/login")
      }
    }

    load()
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [sessionId, router])

  if (!session) return null

  /* =====================
     TIME (SERVER-BASED)
  ===================== */
  let remaining = session.remaining_seconds

  if (session.status === "ACTIVE") {
    const base = new Date(session.resume_time ?? session.start_time).getTime()
    const elapsed = Math.floor((now - base) / 1000)
    remaining = Math.max(0, session.remaining_seconds - elapsed)
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <Smartphone className="mx-auto mb-4 h-16 w-16 text-cyan-400" />
        <h2 className="text-xl mb-2">{session.device_id.name}</h2>

        <p className="font-mono text-3xl flex items-center justify-center gap-2">
          <Clock className="h-5 w-5 text-cyan-400" />
          {minutes.toString().padStart(2, "0")}:
          {seconds.toString().padStart(2, "0")}
        </p>

        {session.status !== "ACTIVE" && (
          <p className="mt-2 text-sm text-slate-400">
            Session {session.status.toLowerCase()}
          </p>
        )}
      </div>
    </div>
  )
}
