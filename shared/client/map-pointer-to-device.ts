export type Size2D = { width: number; height: number };

function mapClientToTarget(
  clientX: number,
  clientY: number,
  element: HTMLElement | null,
  videoSize: Size2D,
  targetSize: Size2D,
): { x: number; y: number } | null {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;

  const vw = videoSize.width > 0 ? videoSize.width : 1080;
  const vh = videoSize.height > 0 ? videoSize.height : 2340;
  const tw = targetSize.width > 0 ? targetSize.width : vw;
  const th = targetSize.height > 0 ? targetSize.height : vh;

  const scale = Math.min(rect.width / vw, rect.height / vh);
  const contentW = vw * scale;
  const contentH = vh * scale;
  const offsetX = (rect.width - contentW) / 2;
  const offsetY = (rect.height - contentH) / 2;

  const localX = clientX - rect.left - offsetX;
  const localY = clientY - rect.top - offsetY;

  const clampedX = Math.max(0, Math.min(contentW, localX));
  const clampedY = Math.max(0, Math.min(contentH, localY));

  const nx = contentW > 0 ? clampedX / contentW : 0;
  const ny = contentH > 0 ? clampedY / contentH : 0;

  return {
    x: Math.round(Math.max(0, Math.min(1, nx)) * Math.max(0, tw - 1)),
    y: Math.round(Math.max(0, Math.min(1, ny)) * Math.max(0, th - 1)),
  };
}

/**
 * Map viewport (client) coords → ADB input space (wm size).
 * Accounts for CSS object-contain letterboxing on the video/canvas element.
 */
export function mapClientToDevice(
  clientX: number,
  clientY: number,
  element: HTMLElement | null,
  videoSize: Size2D,
  deviceSize: Size2D,
): { x: number; y: number } | null {
  return mapClientToTarget(clientX, clientY, element, videoSize, deviceSize);
}

/**
 * Map viewport coords → scrcpy video frame space (matches stream width/height).
 * Use for touch down/move/up over the scrcpy control channel.
 */
export function mapClientToVideo(
  clientX: number,
  clientY: number,
  element: HTMLElement | null,
  videoSize: Size2D,
): { x: number; y: number } | null {
  return mapClientToTarget(clientX, clientY, element, videoSize, videoSize);
}
