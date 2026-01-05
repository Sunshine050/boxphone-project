"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Plus, Smartphone, LogOut, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Session {
  id: string
  deviceName: string
  status: "running" | "expired"
  startTime: number
  duration: number // in minutes
}

export function SessionDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (!user) {
      router.push("/login")
      return
    }

    const savedSessions = localStorage.getItem("sessions")
    if (savedSessions) {
      const loadedSessions = JSON.parse(savedSessions)
      setSessions(loadedSessions)
      if (loadedSessions.length > 0) {
        setSelectedSession(loadedSessions[0])
      }
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [router])

  const getRemainingTime = (session: Session) => {
    const elapsed = Math.floor((currentTime - session.startTime) / 1000)
    const totalSeconds = session.duration * 60
    const remaining = Math.max(0, totalSeconds - elapsed)

    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60

    return { minutes, seconds, expired: remaining === 0 }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const handleNewSession = () => {
    router.push("/devices")
  }

  const handleOpenSession = (sessionId: string) => {
    router.push(`/control/${sessionId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="container mx-auto p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-cyan-500/10">
              <Smartphone className="h-5 w-5 md:h-6 md:w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">CloudPhone Devices</h1>
              <p className="text-xs md:text-sm text-slate-400">
                {localStorage.getItem("user") || "User"} ({sessions.length} device{sessions.length !== 1 ? "s" : ""})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Button
              onClick={handleNewSession}
              size="lg"
              className="border-2 border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {sessions.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
              <CardContent className="flex min-h-[300px] flex-col items-center justify-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                  <Smartphone className="h-10 w-10 text-slate-600" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">No Active Sessions</h3>
                <p className="mb-6 text-slate-400">Start a new session to rent an Android device</p>
                <Button
                  onClick={handleNewSession}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Start First Session
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-72 xl:w-80 pb-2 lg:pb-0"
              style={{ maxHeight: "calc(100vh - 200px)" }}
            >
              {sessions.map((session, index) => {
                const { minutes, seconds, expired } = getRemainingTime(session)
                const isExpired = expired || session.status === "expired"
                const isSelected = selectedSession?.id === session.id

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all shrink-0 lg:shrink ${
                      isSelected
                        ? "border-cyan-500 bg-slate-800/80 shadow-lg shadow-cyan-500/20"
                        : "border-slate-800 bg-slate-900/80 hover:border-cyan-500/50"
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center gap-3 p-3 md:p-4 min-w-[280px] lg:min-w-0">
                      <div className="relative flex h-14 w-10 md:h-16 md:w-12 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 shrink-0">
                        <Smartphone className="h-6 w-6 md:h-8 md:w-8 text-slate-600" />
                        {!isExpired && (
                          <div className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-md bg-green-500 px-1.5 py-0.5">
                            <Users className="h-2.5 w-2.5 text-white" />
                            <span className="text-[10px] font-semibold text-white">1</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{session.deviceName}</p>
                        <p className="text-xs text-slate-500 truncate">ID: {session.id.slice(0, 8)}</p>
                        {!isExpired ? (
                          <div className="mt-1 flex items-center gap-2">
                            <Clock className="h-3 w-3 text-cyan-400 shrink-0" />
                            <span className="font-mono text-xs font-semibold text-cyan-400">
                              {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
                            </span>
                            <Badge className="bg-green-500/20 px-1.5 py-0 text-[10px] text-green-400">Live</Badge>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs font-semibold text-red-400">Expired</p>
                        )}
                      </div>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800/50 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          !isExpired && handleOpenSession(session.id)
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="h-4 w-4"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>

            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {selectedSession && (
                  <motion.div
                    key={selectedSession.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                      <CardContent className="p-4 md:p-6">
                        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h2 className="text-xl md:text-2xl font-bold text-white truncate">
                              {selectedSession.deviceName}
                            </h2>
                            <p className="text-xs md:text-sm text-slate-400 truncate">
                              Session ID: {selectedSession.id}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleOpenSession(selectedSession.id)}
                            disabled={getRemainingTime(selectedSession).expired || selectedSession.status === "expired"}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 w-full sm:w-auto"
                          >
                            <Smartphone className="mr-2 h-4 w-4" />
                            Open Full Control
                          </Button>
                        </div>
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="relative mx-auto aspect-[9/16] max-h-[500px] md:max-h-[600px] overflow-hidden rounded-2xl border-4 border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900"
                        >
                          <div className="flex h-full flex-col items-center justify-center p-6 md:p-8">
                            <Smartphone className="mb-4 h-24 w-24 md:h-32 md:w-32 text-slate-700" />
                            <p className="text-center text-base md:text-lg text-slate-600">
                              {getRemainingTime(selectedSession).expired || selectedSession.status === "expired"
                                ? "Session Ended"
                                : "Live Device Preview"}
                            </p>
                          </div>
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute right-3 top-3 md:right-4 md:top-4 flex items-center gap-2 rounded-lg bg-green-500/90 px-2 py-1.5 md:px-3 md:py-2"
                          >
                            <Users className="h-3 w-3 md:h-4 md:w-4 text-white" />
                            <span className="text-xs md:text-sm font-semibold text-white">1 User Online</span>
                          </motion.div>
                          {!getRemainingTime(selectedSession).expired && selectedSession.status !== "expired" && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-4 rounded-xl bg-black/70 px-3 py-2 md:px-4 md:py-3 backdrop-blur-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-cyan-400" />
                                  <span className="font-mono text-xl md:text-2xl font-bold text-white">
                                    {getRemainingTime(selectedSession).minutes.toString().padStart(2, "0")}:
                                    {getRemainingTime(selectedSession).seconds.toString().padStart(2, "0")}
                                  </span>
                                </div>
                                <Badge className="bg-green-500/30 px-2 py-0.5 md:px-3 md:py-1 text-xs md:text-sm text-green-400">
                                  Live
                                </Badge>
                              </div>
                            </motion.div>
                          )}
                          {(getRemainingTime(selectedSession).expired || selectedSession.status === "expired") && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                            >
                              <div className="text-center px-4">
                                <Clock className="mx-auto mb-3 h-12 w-12 md:h-16 md:w-16 text-red-400" />
                                <p className="text-lg md:text-xl font-semibold text-red-400">Session Expired</p>
                                <p className="mt-2 text-xs md:text-sm text-slate-400">
                                  Start a new session to continue
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
