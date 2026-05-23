export type Size2D = { width: number; height: number };

export type VideoFitMode = "contain" | "balanced" | "cover";

/** Between contain and cover — mild zoom (cover was too aggressive at 1.0). */
export const BALANCED_FIT_BLEND = 0.28;

export function computeVideoFitLayout(
  rectWidth: number,
  rectHeight: number,
  videoSize: Size2D,
  fit: VideoFitMode = "contain",
) {
  const vw = videoSize.width > 0 ? videoSize.width : 1080;
  const vh = videoSize.height > 0 ? videoSize.height : 2340;
  const containScale = Math.min(rectWidth / vw, rectHeight / vh);
  const coverScale = Math.max(rectWidth / vw, rectHeight / vh);
  const scale =
    fit === "cover"
      ? coverScale
      : fit === "balanced"
        ? containScale + (coverScale - containScale) * BALANCED_FIT_BLEND
        : containScale;
  const contentW = vw * scale;
  const contentH = vh * scale;
  const offsetX = (rectWidth - contentW) / 2;
  const offsetY = (rectHeight - contentH) / 2;
  return { scale, contentW, contentH, offsetX, offsetY, vw, vh };
}
