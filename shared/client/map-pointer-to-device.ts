export type Size2D = { width: number; height: number };

/**
 * Map viewport (client) coords → ADB input space.
 * Accounts for CSS object-contain letterboxing on the video/canvas element.
 */
export function mapClientToDevice(
  clientX: number,
  clientY: number,
  element: HTMLElement | null,
  videoSize: Size2D,
  deviceSize: Size2D,
): { x: number; y: number } | null {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;

  const vw = videoSize.width > 0 ? videoSize.width : 1080;
  const vh = videoSize.height > 0 ? videoSize.height : 2340;
  const dw = deviceSize.width > 0 ? deviceSize.width : vw;
  const dh = deviceSize.height > 0 ? deviceSize.height : vh;

  const scale = Math.min(rect.width / vw, rect.height / vh);
  const contentW = vw * scale;
  const contentH = vh * scale;
  const offsetX = (rect.width - contentW) / 2;
  const offsetY = (rect.height - contentH) / 2;

  const localX = clientX - rect.left - offsetX;
  const localY = clientY - rect.top - offsetY;

  // Snap to nearest edge when tapping letterbox padding (common on phones / iPad).
  const clampedX = Math.max(0, Math.min(contentW, localX));
  const clampedY = Math.max(0, Math.min(contentH, localY));

  const nx = contentW > 0 ? clampedX / contentW : 0;
  const ny = contentH > 0 ? clampedY / contentH : 0;

  // Use (dw-1)/(dh-1) — matches Android input coordinate space on Samsung / most devices.
  return {
    x: Math.round(Math.max(0, Math.min(1, nx)) * Math.max(0, dw - 1)),
    y: Math.round(Math.max(0, Math.min(1, ny)) * Math.max(0, dh - 1)),
  };
}
