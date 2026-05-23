"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileImmersive } from "@/hooks/use-mobile-immersive";

type MobileLandscapePhoneShellProps = {
  deviceName: string;
  remainingLabel: string;
  remainingClassName: string;
  onCollapse?: () => void;
  toolbarExtra?: ReactNode;
  stream: ReactNode;
  nav?: ReactNode;
};

/** Edge-to-edge stream; controls float on top (mobile landscape only). */
export function MobileLandscapePhoneShell({
  deviceName,
  remainingLabel,
  remainingClassName,
  onCollapse,
  toolbarExtra,
  stream,
  nav,
}: MobileLandscapePhoneShellProps) {
  useMobileImmersive(true);

  return (
    <div
      className="fixed inset-0 z-[100] h-[100dvh] w-[100dvw] overflow-hidden bg-black"
      data-mobile-landscape-shell
    >
      <div className="absolute inset-0">{stream}</div>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20",
          "bg-gradient-to-b from-black/85 via-black/40 to-transparent",
          "px-2 pb-2 pt-[max(0.25rem,env(safe-area-inset-top))]",
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="pointer-events-auto inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md bg-black/50 px-2 text-slate-100 backdrop-blur-sm active:bg-black/70"
              aria-label="กลับ"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[10px]">กลับ</span>
            </button>
          )}
          <span className="pointer-events-none min-w-0 flex-1 truncate text-xs font-semibold text-white drop-shadow">
            {deviceName}
          </span>
          <div className="pointer-events-auto shrink-0">{toolbarExtra}</div>
          <span
            className={cn(
              "pointer-events-none shrink-0 text-[10px] font-bold tabular-nums drop-shadow",
              remainingClassName,
            )}
          >
            {remainingLabel}
          </span>
        </div>
      </div>

      {nav ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-20 flex flex-col justify-center",
            "bg-gradient-to-l from-black/80 via-black/35 to-transparent",
            "py-4 pl-8 pr-[max(0.35rem,env(safe-area-inset-right))]",
          )}
        >
          <div className="flex flex-col gap-1.5">{nav}</div>
        </div>
      ) : null}
    </div>
  );
}
