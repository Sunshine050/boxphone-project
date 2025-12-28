"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Home, RotateCcw, Square, Volume2, Clock, Smartphone, Power } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Session {
  id: string
  deviceName: string
  status: "running" | "expired"
  startTime: number
  duration: number
}

export function AndroidControl({ paramsPromise }: { paramsPromise: Promise<{ sessionId: string }> }) {
  const params = use(paramsPromise)
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user")
    if (!user) {
      router.push("/login")
      return
    }

    // Load session
    const savedSessions = localStorage.getItem("sessions")
    if (savedSessions) {
      const sessions: Session[] = JSON.parse(savedSessions)
      const currentSession = sessions.find((s) => s.id === params.sessionId)
      if (currentSession) {
        setSession(currentSession)
      } else {
        router.push("/dashboard")
      }
    }

    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [params.sessionId, router])

  useEffect(() => {
    if (session) {
      const elapsed = Math.floor((currentTime - session.startTime) / 1000)
      const totalSeconds = session.duration * 60
      const remaining = Math.max(0, totalSeconds - elapsed)

      if (remaining === 0 && !showExpiredModal) {
        setShowExpiredModal(true)
      }
    }
  }, [currentTime, session, showExpiredModal])

  const getRemainingTime = () => {
    if (!session) return { minutes: 0, seconds: 0 }

    const elapsed = Math.floor((currentTime - session.startTime) / 1000)
    const totalSeconds = session.duration * 60
    const remaining = Math.max(0, totalSeconds - elapsed)

    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60

    return { minutes, seconds }
  }

  const handleEndSession = () => {
    // Remove session
    const savedSessions = localStorage.getItem("sessions")
    if (savedSessions) {
      const sessions: Session[] = JSON.parse(savedSessions)
      const updatedSessions = sessions.filter((s) => s.id !== params.sessionId)
      localStorage.setItem("sessions", JSON.stringify(updatedSessions))
    }
    router.push("/dashboard")
  }

  const handleReturnToDashboard = () => {
    router.push("/dashboard")
  }

  if (!session) {
    return null
  }

  const { minutes, seconds } = getRemainingTime()

  return (
    <>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl">
          <Button variant="ghost" onClick={handleReturnToDashboard} className="mb-6 text-slate-400 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>

          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-950/50">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
                    <Smartphone className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{session.deviceName}</h3>
                    <p className="text-sm text-slate-400">Session {session.id}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Status</span>
                    <Badge className="bg-green-500/20 text-green-400">Running</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                    <span className="text-sm text-slate-400">Time Remaining</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-cyan-400" />
                      <span className="font-mono text-lg font-semibold text-white">
                        {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-400">Device Controls</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 border-slate-800 bg-slate-950/50 hover:bg-slate-800"
                >
                  <RotateCcw className="h-5 w-5 text-cyan-400" />
                  <span className="text-xs text-slate-300">Back</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 border-slate-800 bg-slate-950/50 hover:bg-slate-800"
                >
                  <Home className="h-5 w-5 text-cyan-400" />
                  <span className="text-xs text-slate-300">Home</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 border-slate-800 bg-slate-950/50 hover:bg-slate-800"
                >
                  <Square className="h-5 w-5 text-cyan-400" />
                  <span className="text-xs text-slate-300">Recent</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 border-slate-800 bg-slate-950/50 hover:bg-slate-800"
                >
                  <Volume2 className="h-5 w-5 text-cyan-400" />
                  <span className="text-xs text-slate-300">Volume</span>
                </Button>
              </div>
            </div>

            <Button
              onClick={handleEndSession}
              variant="destructive"
              className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <Power className="mr-2 h-4 w-4" />
              End Session
            </Button>
          </div>
        </div>

        {/* Main Screen Area */}
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="relative">
            {/* Android Screen */}
            <div
              className="relative h-[720px] w-[360px] overflow-hidden rounded-3xl border-8 border-slate-800 bg-slate-950 shadow-2xl"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setMousePos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                })
              }}
            >
              {/* Mock Android Home Screen */}
              <div className="h-full w-full bg-gradient-to-br from-slate-900 to-slate-800">
                {/* Status Bar */}
                <div className="flex items-center justify-between bg-slate-950/50 px-4 py-2 text-xs text-slate-400">
                  <span>12:34</span>
                  <div className="flex gap-2">
                    <span>WiFi</span>
                    <span>Battery</span>
                  </div>
                </div>

                {/* App Grid */}
                <div className="grid grid-cols-4 gap-6 p-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
                        <Smartphone className="h-7 w-7 text-cyan-400" />
                      </div>
                      <span className="text-[10px] text-slate-400">App {i + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Touch Indicator */}
                <div
                  className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400/50 bg-cyan-400/20"
                  style={{
                    left: mousePos.x,
                    top: mousePos.y,
                  }}
                />
              </div>
            </div>

            {/* Screen Label */}
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-400">Click to tap • Drag to swipe • Type to input</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session Expired Modal */}
      <Dialog open={showExpiredModal} onOpenChange={setShowExpiredModal}>
        <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <Clock className="h-8 w-8 text-red-400" />
            </div>
            <DialogTitle className="text-center text-2xl text-white">Session Expired</DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              Your device session has ended and the device has been released.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={handleReturnToDashboard}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
          >
            Return to Dashboard
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
