import * as React from "react";

const HTML_CLASS = "mobile-browser-immersive";

/**
 * On phone landscape: hide browser URL bar where possible (Fullscreen API + scroll).
 * Exits when `active` becomes false or on unmount.
 */
export function useMobileImmersive(active: boolean): void {
  React.useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const root = document.documentElement;
    root.classList.add(HTML_CLASS);

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = root.style.overflow;
    document.body.style.overflow = "hidden";
    root.style.overflow = "hidden";

    const nudgeBrowserChrome = () => {
      window.scrollTo(0, 1);
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    };

    const tryFullscreen = async () => {
      try {
        if (document.fullscreenElement == null && root.requestFullscreen) {
          await root.requestFullscreen();
        }
      } catch {
        /* Often requires a user gesture — scroll nudge is the fallback. */
      }
      nudgeBrowserChrome();
    };

    void tryFullscreen();
    const onOrient = () => {
      window.setTimeout(() => {
        void tryFullscreen();
      }, 280);
    };
    window.addEventListener("orientationchange", onOrient);

    const onResize = () => nudgeBrowserChrome();
    window.visualViewport?.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("orientationchange", onOrient);
      window.visualViewport?.removeEventListener("resize", onResize);
      root.classList.remove(HTML_CLASS);
      document.body.style.overflow = prevBodyOverflow;
      root.style.overflow = prevHtmlOverflow;
      if (document.fullscreenElement === root) {
        void document.exitFullscreen?.().catch(() => undefined);
      }
    };
  }, [active]);
}
