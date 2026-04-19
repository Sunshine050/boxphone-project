"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Home, RotateCcw, Square } from "lucide-react";
import type { Session } from "@/types/session";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/$/, "");

const KEY = { BACK: 4, HOME: 3, RECENTS: 187 };

function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(^|\s)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[2].trim()) : null;
}

async function sendInput(
  deviceId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  const csrf = getCsrfToken();
  return fetch(`${BASE_URL}/devices/${deviceId}/input`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf && { "X-CSRF-Token": csrf }),
    },
    credentials: "include",
    body: JSON.stringify({ type, payload }),
  });
}

function TouchOverlay({
  deviceId,
  imgRef,
  onAction,
}: {
  deviceId: string;
  imgRef: React.RefObject<HTMLImageElement | null>;
  onAction: () => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(
    null,
  );
  const [ripple, setRipple] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const rippleId = useRef(0);

  const toAndroid = useCallback(
    (clientX: number, clientY: number) => {
      const rect = divRef.current!.getBoundingClientRect();
      const img = imgRef.current;
      const nW = img && img.naturalWidth > 0 ? img.naturalWidth : 1080;
      const nH = img && img.naturalHeight > 0 ? img.naturalHeight : 2340;
      return {
        x: ((clientX - rect.left) / rect.width) * nW,
        y: ((clientY - rect.top) / rect.height) * nH,
      };
    },
    [imgRef],
  );

  const showRipple = (clientX: number, clientY: number) => {
    const rect = divRef.current!.getBoundingClientRect();
    const id = ++rippleId.current;
    setRipple({ x: clientX - rect.left, y: clientY - rect.top, id });
    setTimeout(() => setRipple((r) => (r?.id === id ? null : r)), 400);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!touchStartRef.current) return;
    const { x: sx, y: sy, t } = touchStartRef.current;
    touchStartRef.current = null;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    const dist = Math.hypot(dx, dy);
    const dt = Date.now() - t;

    if (dist < 10 && dt < 400) {
      const pos = toAndroid(e.clientX, e.clientY);
      showRipple(e.clientX, e.clientY);
      sendInput(deviceId, "tap", { x: pos.x, y: pos.y }).then(() => onAction());
    } else if (dist >= 10) {
      const from = toAndroid(sx, sy);
      const to = toAndroid(e.clientX, e.clientY);
      sendInput(deviceId, "swipe", {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        duration: Math.min(dt, 600),
      }).then(() => onAction());
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const { x: sx, y: sy, t: st } = touchStartRef.current;
    touchStartRef.current = null;

    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    const dist = Math.hypot(dx, dy);
    const dt = Date.now() - st;

    if (dist < 15 && dt < 500) {
      const pos = toAndroid(t.clientX, t.clientY);
      showRipple(t.clientX, t.clientY);
      sendInput(deviceId, "tap", { x: pos.x, y: pos.y }).then(() => onAction());
    } else {
      const from = toAndroid(sx, sy);
      const to = toAndroid(t.clientX, t.clientY);
      sendInput(deviceId, "swipe", {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        duration: Math.min(dt, 600),
      }).then(() => onAction());
    }
  };

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
  );
}

export function SessionPhoneControl({ session }: { session: Session }) {
  const [now, setNow] = useState(Date.now());
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const deviceId = session.device_id?._id;
  const refreshScreenshot = useCallback(() => {
    if (!deviceId) return;
    fetch(`${BASE_URL}/devices/${deviceId}/screenshot`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setImgSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setImgError(false);
      })
      .catch(() => setImgError(true));
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    refreshScreenshot();
    imgTimerRef.current = setInterval(refreshScreenshot, 2000);
    return () => {
      if (imgTimerRef.current) clearInterval(imgTimerRef.current);
    };
  }, [deviceId, refreshScreenshot]);

  const handleActionRefresh = useCallback(() => {
    setTimeout(() => refreshScreenshot(), 400);
  }, [refreshScreenshot]);

  let remaining = session.remaining_seconds;
  if (session.status === "ACTIVE") {
    const base = new Date(session.resume_time ?? session.start_time).getTime();
    remaining = Math.max(
      0,
      session.remaining_seconds - Math.floor((now - base) / 1000),
    );
  }
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const expired = remaining <= 0;

  return (
    <div className="flex w-[min(100%,380px)] shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
        <span className="truncate text-sm font-semibold text-white">
          {session.device_id?.name || "Device"}
        </span>
        <div
          className={`flex shrink-0 items-center gap-1 font-mono text-sm font-bold tabular-nums ${
            expired ? "text-red-400" : "text-cyan-400"
          }`}
        >
          {expired
            ? "หมดเวลา"
            : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
        </div>
      </div>

      <div className="relative mx-auto w-full">
        <div className="relative mx-auto aspect-[9/19.5] w-full max-w-xs overflow-hidden rounded-[2.5rem] border-[6px] border-slate-700 bg-slate-900 shadow-2xl shadow-cyan-900/20">
          {imgSrc && !imgError ? (
            <img
              ref={imgRef}
              src={imgSrc}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
              <div
                className={`h-10 w-10 rounded-full border-4 border-cyan-500 ${imgError ? "opacity-30" : "border-t-transparent animate-spin"}`}
              />
              <span className="text-xs text-slate-400">
                {imgError ? "ไม่สามารถโหลดภาพได้" : "กำลังโหลดหน้าจอ..."}
              </span>
            </div>
          )}

          {!expired && deviceId && (
            <TouchOverlay
              deviceId={deviceId}
              imgRef={imgRef}
              onAction={handleActionRefresh}
            />
          )}

          {expired && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80">
              <span className="text-lg font-bold text-red-400">
                หมดเวลาใช้งาน
              </span>
            </div>
          )}

          {!expired && imgSrc && !imgError && (
            <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              <span className="text-[9px] font-semibold text-green-400">
                LIVE
              </span>
            </div>
          )}
        </div>

        {!expired && deviceId && (
          <div className="mt-4 flex justify-around px-2">
            {[
              {
                icon: <RotateCcw className="h-5 w-5" />,
                key: KEY.BACK,
                label: "Back",
              },
              {
                icon: <Home className="h-5 w-5" />,
                key: KEY.HOME,
                label: "Home",
              },
              {
                icon: <Square className="h-5 w-5" />,
                key: KEY.RECENTS,
                label: "Recents",
              },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                aria-label={btn.label}
                onClick={() => {
                  sendInput(deviceId, "key", { keycode: btn.key }).then(() =>
                    handleActionRefresh(),
                  );
                }}
                className="flex flex-col items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white active:bg-slate-600"
              >
                {btn.icon}
                <span className="text-[9px] text-slate-500">{btn.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
