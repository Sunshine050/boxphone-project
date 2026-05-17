/** How the phone frame aspect ratio is chosen (small card + expanded). */
export type ScreenOrientationMode = "auto" | "portrait" | "landscape";

const STORAGE_PREFIX = "boxphone-orient-";

export function loadOrientationMode(sessionId: string): ScreenOrientationMode {
  if (typeof window === "undefined") return "auto";
  const v = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
  if (v === "portrait" || v === "landscape") return v;
  return "auto";
}

export function saveOrientationMode(
  sessionId: string,
  mode: ScreenOrientationMode,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, mode);
}

export function cycleOrientationMode(
  current: ScreenOrientationMode,
): ScreenOrientationMode {
  if (current === "auto") return "portrait";
  if (current === "portrait") return "landscape";
  return "auto";
}

const ORIENTATION_LABELS: Record<ScreenOrientationMode, string> = {
  auto: "อัตโนมัติ",
  portrait: "แนวตั้ง",
  landscape: "แนวนอน",
};

export function orientationLabel(mode: ScreenOrientationMode): string {
  return ORIENTATION_LABELS[mode];
}

/**
 * Frame aspect ratio (width/height) for CSS aspect-ratio.
 * Uses stream dimensions — object-contain keeps video undistorted.
 */
export function computeFrameAspectRatio(
  streamWidth: number,
  streamHeight: number,
  mode: ScreenOrientationMode,
): number {
  if (streamWidth <= 0 || streamHeight <= 0) return 9 / 16;
  const streamRatio = streamWidth / streamHeight;
  const streamIsLandscape = streamRatio >= 1;

  if (mode === "auto") return streamRatio;

  // Portrait frame: width/height < 1
  if (mode === "portrait") {
    return streamIsLandscape ? streamHeight / streamWidth : streamRatio;
  }

  // Landscape frame: width/height >= 1 (swap when stream is portrait)
  return streamIsLandscape ? streamRatio : streamHeight / streamWidth;
}

export function isLandscapeFrame(aspectRatio: number): boolean {
  return aspectRatio >= 1;
}
