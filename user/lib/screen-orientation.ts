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

/** Logical frame size (CSS px) from encoded stream + user orientation lock. */
export function getFrameDimensions(
  streamWidth: number,
  streamHeight: number,
  mode: ScreenOrientationMode,
): { width: number; height: number } {
  const sw = Math.max(1, Math.round(streamWidth));
  const sh = Math.max(1, Math.round(streamHeight));
  const streamIsLandscape = sw >= sh;

  if (mode === "auto") {
    return { width: sw, height: sh };
  }

  if (mode === "portrait") {
    return streamIsLandscape
      ? { width: Math.min(sw, sh), height: Math.max(sw, sh) }
      : { width: sw, height: sh };
  }

  // landscape — swap so width is always the long edge
  return streamIsLandscape
    ? { width: sw, height: sh }
    : { width: sh, height: sw };
}

/** Frame aspect ratio (width/height) for CSS `aspect-ratio`. */
export function computeFrameAspectRatio(
  streamWidth: number,
  streamHeight: number,
  mode: ScreenOrientationMode,
): number {
  const { width, height } = getFrameDimensions(streamWidth, streamHeight, mode);
  return width / height;
}

/** CSS aspect-ratio value, e.g. `"2340 / 1080"`. */
export function frameAspectRatioCss(
  streamWidth: number,
  streamHeight: number,
  mode: ScreenOrientationMode,
): string {
  const { width, height } = getFrameDimensions(streamWidth, streamHeight, mode);
  return `${width} / ${height}`;
}

export function isLandscapeFrame(aspectRatio: number): boolean {
  return aspectRatio >= 1;
}
