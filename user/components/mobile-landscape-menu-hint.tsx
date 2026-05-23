"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const HINT_DISMISSED_KEY = "boxphone-landscape-menu-hint-dismissed";
const HINT_POSITION_KEY = "boxphone-landscape-menu-hint-position";
const HINT_VISIBLE_MS = 5000;
const HINT_FADE_MS = 700;

type HintPosition = { x: number; y: number };

function loadDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function loadPosition(): HintPosition | null {
  try {
    const raw = localStorage.getItem(HINT_POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HintPosition;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function savePosition(pos: HintPosition) {
  try {
    localStorage.setItem(HINT_POSITION_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

function shellRect(): DOMRect {
  const el = document.querySelector("[data-mobile-landscape-shell]");
  return (
    el?.getBoundingClientRect() ??
    new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  );
}

function defaultPosition(hint: DOMRect): HintPosition {
  const shell = shellRect();
  const margin = 8;
  const fabSize = 40;
  const gap = 6;
  return {
    x: shell.left + margin,
    y: shell.bottom - hint.height - margin - fabSize - gap,
  };
}

function clampPosition(x: number, y: number, hint: DOMRect): HintPosition {
  const shell = shellRect();
  const pad = 6;
  const minX = shell.left + pad;
  const minY = shell.top + pad;
  const maxX = shell.right - hint.width - pad;
  const maxY = shell.bottom - hint.height - pad;
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  };
}

export function useLandscapeMenuHint() {
  const [enabled, setEnabled] = React.useState(() => !loadDismissed());

  const dismissPermanent = React.useCallback(() => {
    setEnabled(false);
    try {
      localStorage.setItem(HINT_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  return { enabled, dismissPermanent };
}

type MobileLandscapeMenuHintProps = {
  onDismissPermanent: () => void;
};

/** Hint: 5s visible → fade out. Draggable via touch/pointer (portal above stream). */
export function MobileLandscapeMenuHint({
  onDismissPermanent,
}: MobileLandscapeMenuHintProps) {
  const hintRef = React.useRef<HTMLDivElement | null>(null);
  const draggingRef = React.useRef(false);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const fadeTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const [mounted, setMounted] = React.useState(false);
  const [shown, setShown] = React.useState(true);
  const [fading, setFading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [position, setPosition] = React.useState<HintPosition>(() => {
    if (typeof window === "undefined") return { x: 12, y: 80 };
    return (
      loadPosition() ?? {
        x: 12,
        y: Math.max(12, window.innerHeight - 100),
      }
    );
  });

  const positionRef = React.useRef(position);
  positionRef.current = position;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const clearFadeTimers = React.useCallback(() => {
    fadeTimersRef.current.forEach(clearTimeout);
    fadeTimersRef.current = [];
  }, []);

  const scheduleAutoFade = React.useCallback(() => {
    clearFadeTimers();
    fadeTimersRef.current.push(
      setTimeout(() => setFading(true), HINT_VISIBLE_MS),
    );
    fadeTimersRef.current.push(
      setTimeout(() => setShown(false), HINT_VISIBLE_MS + HINT_FADE_MS),
    );
  }, [clearFadeTimers]);

  React.useEffect(() => {
    scheduleAutoFade();
    return clearFadeTimers;
  }, [scheduleAutoFade, clearFadeTimers]);

  const applyPosition = React.useCallback((next: HintPosition) => {
    positionRef.current = next;
    setPosition(next);
  }, []);

  const measureAndPlace = React.useCallback(() => {
    if (draggingRef.current) return;
    const hint = hintRef.current;
    if (!hint) return;
    const hintRect = hint.getBoundingClientRect();
    const saved = loadPosition();
    const raw = saved ?? defaultPosition(hintRect);
    applyPosition(clampPosition(raw.x, raw.y, hintRect));
  }, [applyPosition]);

  React.useLayoutEffect(() => {
    if (!shown) return;
    measureAndPlace();
    const onResize = () => measureAndPlace();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [shown, measureAndPlace]);

  const moveDrag = React.useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      const hint = hintRef.current;
      if (!drag || !hint) return;
      const hintRect = hint.getBoundingClientRect();
      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;
      applyPosition(
        clampPosition(drag.originX + dx, drag.originY + dy, hintRect),
      );
    },
    [applyPosition],
  );

  const endDrag = React.useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    draggingRef.current = false;
    setDragging(false);
    savePosition(positionRef.current);
    scheduleAutoFade();
  }, [scheduleAutoFade]);

  const startDrag = React.useCallback(
    (clientX: number, clientY: number) => {
      clearFadeTimers();
      setFading(false);
      draggingRef.current = true;
      setDragging(true);
      dragRef.current = {
        startX: clientX,
        startY: clientY,
        originX: positionRef.current.x,
        originY: positionRef.current.y,
      };
    },
    [clearFadeTimers],
  );

  React.useEffect(() => {
    if (!shown) return;

    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchEnd = () => endDrag();

    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    };

    const onPointerUp = () => endDrag();

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);

    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, [shown, moveDrag, endDrag]);

  const onTouchDragStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || e.touches.length !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onPointerDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  };

  const dismissForever = () => {
    clearFadeTimers();
    setShown(false);
    onDismissPermanent();
  };

  if (!mounted || !shown) return null;

  const hint = (
    <div
      ref={hintRef}
      role="status"
      className={cn(
        "pointer-events-auto fixed z-[200] max-w-[12rem] rounded-lg border border-white/10 bg-black/85 shadow-lg backdrop-blur-md",
        "select-none transition-opacity ease-out",
        dragging ? "cursor-grabbing" : "cursor-grab",
        fading ? "opacity-0" : "opacity-100",
      )}
      style={{
        left: position.x,
        top: position.y,
        touchAction: "none",
        transitionDuration: `${HINT_FADE_MS}ms`,
      }}
      onTouchStart={onTouchDragStart}
      onPointerDown={onPointerDragStart}
    >
      <div className="flex items-start gap-1 py-1.5 pr-1 pl-2.5">
        <p className="flex-1 text-[10px] leading-snug text-slate-200">
          ลากย้ายได้ · แตะ ≡ เมื่อต้องการเมนูระบบ
        </p>
        <button
          type="button"
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            dismissForever();
          }}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="ปิดคำแนะนำถาวร"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return createPortal(hint, document.body);
}
