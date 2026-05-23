"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileLandscapePhoneShellProps = {
  deviceName: string;
  remainingLabel: string;
  remainingClassName: string;
  onCollapse?: () => void;
  toolbarExtra?: ReactNode;
  stream: ReactNode;
  nav: ReactNode;
};

/** Full-viewport phone UI when a mobile device is held in landscape. */
export function MobileLandscapePhoneShell({
  deviceName,
  remainingLabel,
  remainingClassName,
  onCollapse,
  toolbarExtra,
  stream,
  nav,
}: MobileLandscapePhoneShellProps) {
  return (
    <div
      className="fixed inset-0 z-[55] flex h-[100dvh] w-[100dvw] flex-row gap-1.5 bg-slate-950 p-1.5"
      data-mobile-landscape-shell
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900/90 px-2 py-1">
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-slate-700 bg-slate-800 px-2 text-slate-200 active:bg-slate-700"
              aria-label="กลับ"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[10px]">กลับ</span>
            </button>
          )}
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
            {deviceName}
          </span>
          {toolbarExtra}
          <span
            className={cn(
              "shrink-0 text-[10px] font-bold tabular-nums",
              remainingClassName,
            )}
          >
            {remainingLabel}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {stream}
        </div>
      </div>
      {nav}
    </div>
  );
}
