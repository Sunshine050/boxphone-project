"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Clock, ChevronLeft, Home, RotateCcw, Square } from "lucide-react"

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/$/, "")

// ——— Android Keycode ———
const KEY = { BACK: 4, HOME: 3, RECENTS: 187 }

interface Session {
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

/* ================================================
   HELPERS
================================================ */
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") ?? "" : ""
}

async function sendInput(deviceId: string, type: string, payload: Record<string, any>) {
  return fetch(`${BASE_URL}/devices/${deviceId}/input`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ type, payload }),
  })
}

/* ================================================
   TOUCH OVERLAY — tap & swipe
================================================ */
interface TouchOverlayProps {
  deviceId: string
  imgRef: React.RefObject<HTMLImageElement | null>
  onAction: () => void   // เรียกหลังหลัง input ทุกครั้ง เพื่อ refresh screenshot
}

function TouchOverlay({ deviceId, imgRef, onAction }: TouchOverlayProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null)
  const rippleId = useRef(0)

  // แปลง DOM coordinate → Android coordinate โดยใช้ naturalWidth/Height จากรูปจริง
  const toAndroid = useCallback((clientX: number, clientY: number) => {
    const rect = divRef.current!.getBoundingClientRect()
    const img = imgRef.current
    const nW = img && img.naturalWidth > 0 ? img.naturalWidth : 1080
    const nH = img && img.naturalHeight > 0 ? img.naturalHeight : 2340
    return {
      x: ((clientX - rect.left) / rect.width) * nW,
      y: ((clientY - rect.top) / rect.height) * nH,
    }
  }, [imgRef])

  const showRipple = (clientX: number, clientY: number) => {
    const rect = divRef.current!.getBoundingClientRect()
    const id = ++rippleId.current
    setRipple({ x: clientX - rect.left, y: clientY - rect.top, id })
    setTimeout(() => setRipple(r => r?.id === id ? null : r), 400)
  }

  // ——— Mouse events (desktop) ———
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!touchStartRef.current) return
    const { x: sx, y: sy, t } = touchStartRef.current
    touchStartRef.current = null
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    const dist = Math.hypot(dx, dy)
    const dt = Date.now() - t

    if (dist < 10 && dt < 400) {
      // TAP
      const pos = toAndroid(e.clientX, e.clientY)
      showRipple(e.clientX, e.clientY)
      sendInput(deviceId, "tap", { x: pos.x, y: pos.y }).then(() => onAction())
    } else if (dist >= 10) {
      // SWIPE
      const from = toAndroid(sx, sy)
      const to = toAndroid(e.clientX, e.clientY)
      sendInput(deviceId, "swipe", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, duration: Math.min(dt, 600) }).then(() => onAction())
    }
  }

  // ——— Touch events (mobile) ———
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const t = e.changedTouches[0]
    const { x: sx, y: sy, t: st } = touchStartRef.current
    touchStartRef.current = null

    const dx = t.clientX - sx
    const dy = t.clientY - sy
    const dist = Math.hypot(dx, dy)
    const dt = Date.now() - st

    if (dist < 15 && dt < 500) {
      const pos = toAndroid(t.clientX, t.clientY)
      showRipple(t.clientX, t.clientY)
      sendInput(deviceId, "tap", { x: pos.x, y: pos.y }).then(() => onAction())
    } else {
      const from = toAndroid(sx, sy)
      const to = toAndroid(t.clientX, t.clientY)
      sendInput(deviceId, "swipe", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, duration: Math.min(dt, 600) }).then(() => onAction())
    }
  }

  return (
    <div
      ref={divRef}
      className="absolute inset-0 cursor-pointer select-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {/* Ripple effect */}
      {ripple && (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/40 animate-ping"
          style={{
            left: ripple.x - 20,
            top: ripple.y - 20,
            width: 40,
            height: 40,
          }}
        />
      )}
    </div>
  )
}

/* ================================================
   ANDROID CONTROL PAGE
================================================ */
export function AndroidControl() {
  const router = useRouter()
  const { sessionId } = useParams<{ sessionId: string }>()

  const [session, setSession] = useState<Session | null>(null)
  const [now, setNow] = useState(Date.now())
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const imgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ===================== LOAD SESSION ===================== */
  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<Session[] | null>("/sessions/me")
        const found = data?.find((s) => s._id === sessionId)
        if (!found) { router.push("/dashboard"); return }
        setSession(found)
      } catch {
        router.push("/login")
      }
    }
    load()
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [sessionId, router])

  /* ===================== SCREENSHOT POLLING ===================== */
  const refreshScreenshot = useCallback(() => {
    if (!session?.device_id?._id) return
    const token = getToken()
    if (!token) return
    fetch(`${BASE_URL}/devices/${session.device_id._id}/screenshot`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(r => { if (!r.ok) throw new Error(); return r.blob() })
      .then(blob => {
        const url = URL.createObjectURL(blob)
        setImgSrc(prev => { if (prev) URL.revokeObjectURL(prev); return url })
        setImgError(false)
      })
      .catch(() => setImgError(true))
  }, [session?.device_id?._id])

  useEffect(() => {
    if (!session) return
    refreshScreenshot()
    imgTimerRef.current = setInterval(refreshScreenshot, 2000)   // ลดจาก 5s → 2s
    return () => { if (imgTimerRef.current) clearInterval(imgTimerRef.current) }
  }, [session, refreshScreenshot])

  // เรียกหลัง input — รอ 400ms ให้เครื่อง execute แล้วดึงภาพใหม่ทันที
  const handleActionRefresh = useCallback(() => {
    setTimeout(() => refreshScreenshot(), 400)
  }, [refreshScreenshot])

  if (!session) return null

  /* ===================== COUNTDOWN ===================== */
  let remaining = session.remaining_seconds
  if (session.status === "ACTIVE") {
    const base = new Date(session.resume_time ?? session.start_time).getTime()
    remaining = Math.max(0, session.remaining_seconds - Math.floor((now - base) / 1000))
  }
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const expired = remaining <= 0
  const deviceId = session.device_id._id

  /* ===================== RENDER ===================== */
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white overflow-hidden">

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">กลับ</span>
        </button>
        <span className="font-semibold text-sm truncate max-w-[180px]">{session.device_id.name}</span>
        <div className={`flex items-center gap-1.5 font-mono text-base font-bold ${expired ? "text-red-400" : "text-cyan-400"}`}>
          <Clock className="h-4 w-4" />
          {expired ? "หมดเวลา" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
        </div>
      </div>

      {/* PHONE SCREEN */}
      <div className="flex-1 flex items-center justify-center p-3">
        <div className="relative w-full max-w-xs mx-auto">
          {/* Phone frame */}
          <div className="relative rounded-[2.5rem] border-[6px] border-slate-700 shadow-2xl shadow-cyan-900/30 overflow-hidden bg-slate-900 aspect-[9/19.5]">

            {/* Screenshot */}
            {imgSrc && !imgError ? (
              <img
                ref={imgRef}
                src={imgSrc}
                alt="phone screen"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
                <div className={`w-10 h-10 rounded-full border-4 border-cyan-500 ${imgError ? "opacity-30" : "border-t-transparent animate-spin"}`} />
                <span className="text-slate-400 text-xs">{imgError ? "ไม่สามารถโหลดภาพได้" : "กำลังโหลดหน้าจอ..."}</span>
              </div>
            )}

            {/* Touch Overlay (ซ้อนทับบนภาพ) */}
            {!expired && (
              <TouchOverlay
                deviceId={deviceId}
                imgRef={imgRef}
                onAction={handleActionRefresh}
              />
            )}

            {/* Expired overlay */}
            {expired && (
              <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-10">
                <span className="text-red-400 font-bold text-lg">หมดเวลาใช้งาน</span>
              </div>
            )}

            {/* LIVE badge */}
            {!expired && imgSrc && !imgError && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5 z-10 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] text-green-400 font-semibold">LIVE</span>
              </div>
            )}
          </div>

          {/* ANDROID NAV BAR */}
          {!expired && (
            <div className="flex justify-around mt-4 px-2">
              {[
                { icon: <RotateCcw className="h-5 w-5" />, key: KEY.BACK, label: "Back" },
                { icon: <Home className="h-5 w-5" />, key: KEY.HOME, label: "Home" },
                { icon: <Square className="h-5 w-5" />, key: KEY.RECENTS, label: "Recents" },
              ].map(btn => (
                <button
                  key={btn.key}
                  onClick={() => {
                    sendInput(deviceId, "key", { keycode: btn.key }).then(() => handleActionRefresh())
                  }}
                  aria-label={btn.label}
                  className="flex flex-col items-center gap-1 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 transition-colors text-slate-300 hover:text-white"
                >
                  {btn.icon}
                  <span className="text-[9px] text-slate-500">{btn.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
