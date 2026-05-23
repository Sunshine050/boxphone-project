"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { ChevronLeft, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileImmersive } from "@/hooks/use-mobile-immersive";
import {
  MobileLandscapeMenuHint,
  useLandscapeMenuHint,
} from "@/components/mobile-landscape-menu-hint";

const MENU_AUTO_CLOSE_MS = 5000;

type MobileLandscapePhoneShellProps = {
  deviceName: string;
  remainingLabel: string;
  remainingClassName: string;
  onCollapse?: () => void;
  toolbarExtra?: ReactNode;
  stream: ReactNode;
  nav?: ReactNode;
};

function wrapWithMenuClose(
  node: ReactNode,
  closeMenu: () => void,
): ReactNode {
  if (!node) return null;
  return React.Children.map(node, (child) => {
    if (!React.isValidElement<{ onClick?: (e: React.MouseEvent) => void }>(
      child,
    )) {
      return child;
    }
    const prev = child.props.onClick;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        prev?.(e);
        closeMenu();
      },
    });
  });
}

/** Full-screen stream; controls in slide-out menu (mobile landscape / farm mode). */
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

  const { enabled: hintEnabled, dismissPermanent } = useLandscapeMenuHint();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const autoCloseRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeMenu = React.useCallback(() => {
    setMenuOpen(false);
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }
  }, []);

  const openMenu = React.useCallback(() => {
    setMenuOpen(true);
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    autoCloseRef.current = setTimeout(closeMenu, MENU_AUTO_CLOSE_MS);
    return () => {
      if (autoCloseRef.current) {
        clearTimeout(autoCloseRef.current);
        autoCloseRef.current = null;
      }
    };
  }, [menuOpen, closeMenu]);

  const navWithClose = React.useMemo(
    () => wrapWithMenuClose(nav, closeMenu),
    [nav, closeMenu],
  );

  const toolbarWithClose = React.useMemo(
    () => wrapWithMenuClose(toolbarExtra, closeMenu),
    [toolbarExtra, closeMenu],
  );

  return (
    <div
      className="fixed inset-0 z-[100] h-[100dvh] w-[100dvw] overflow-hidden bg-black"
      data-mobile-landscape-shell
    >
      <div className="absolute inset-0">{stream}</div>

      {/* Glanceable session time — no touch capture */}
      <span
        className={cn(
          "pointer-events-none absolute right-[max(0.5rem,env(safe-area-inset-right))] top-[max(0.35rem,env(safe-area-inset-top))] z-10",
          "rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-bold tabular-nums backdrop-blur-sm",
          remainingClassName,
        )}
      >
        {remainingLabel}
      </span>

      {/* Menu FAB — only when drawer closed */}
      {!menuOpen && (
        <button
          type="button"
          onClick={openMenu}
          className={cn(
            "pointer-events-auto absolute z-[120] flex h-10 w-10 items-center justify-center rounded-full",
            "border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur-md",
            "left-[max(0.5rem,env(safe-area-inset-left))] bottom-[max(0.5rem,env(safe-area-inset-bottom))]",
            "active:scale-95 active:bg-black/70",
          )}
          aria-label="เปิดเมนูระบบ"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {!menuOpen && hintEnabled && (
        <MobileLandscapeMenuHint onDismissPermanent={dismissPermanent} />
      )}

      {menuOpen && (
        <>
          <button
            type="button"
            className="absolute inset-0 z-30 bg-black/50 backdrop-blur-[1px]"
            aria-label="ปิดเมนู"
            onClick={closeMenu}
          />
          <aside
            className={cn(
              "absolute inset-y-0 right-0 z-40 flex w-[min(72vw,15.5rem)] flex-col",
              "border-l border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-md",
              "pr-[max(0.5rem,env(safe-area-inset-right))]",
              "animate-in slide-in-from-right duration-200",
            )}
            role="dialog"
            aria-label="เมนูระบบ"
          >
            <div className="flex items-start justify-between gap-2 border-b border-white/10 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {deviceName}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[11px] font-bold tabular-nums",
                    remainingClassName,
                  )}
                >
                  เหลือ {remainingLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-white/10"
                aria-label="ปิดเมนู"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
              {onCollapse && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onCollapse();
                  }}
                  className="inline-flex w-full items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2.5 text-left text-sm font-medium text-cyan-100 active:bg-cyan-500/25"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  ออกจากจอเต็ม
                </button>
              )}

              {toolbarWithClose ? (
                <div className="flex flex-col gap-1">
                  <span className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    แนวจอ
                  </span>
                  <div>{toolbarWithClose}</div>
                </div>
              ) : null}

              {navWithClose ? (
                <div className="flex flex-col gap-1">
                  <span className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    ปุ่มระบบ Android
                  </span>
                  <div className="flex flex-col gap-1.5">{navWithClose}</div>
                </div>
              ) : null}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
