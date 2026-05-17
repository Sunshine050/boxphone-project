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

  if (localX < 0 || localY < 0 || localX > contentW || localY > contentH) {
    return null;
  }

  const nx = localX / contentW;
  const ny = localY / contentH;

  return {
    x: Math.round(Math.max(0, Math.min(1, nx)) * dw),
    y: Math.round(Math.max(0, Math.min(1, ny)) * dh),
  };
}
