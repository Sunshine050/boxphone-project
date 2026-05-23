"use client";

import * as React from "react";
import {
  computeVideoFitLayout,
  type Size2D,
  type VideoFitMode,
} from "../../shared/client/video-fit-layout";

function resetCanvasLayout(canvas: HTMLCanvasElement) {
  canvas.style.width = "";
  canvas.style.height = "";
  canvas.style.left = "";
  canvas.style.top = "";
  canvas.style.right = "";
  canvas.style.bottom = "";
  canvas.style.margin = "";
}

function applyBalancedLayout(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  videoSize: Size2D,
) {
  const rect = container.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;
  if (videoSize.width <= 0 || videoSize.height <= 0) return;

  const { contentW, contentH, offsetX, offsetY } = computeVideoFitLayout(
    rect.width,
    rect.height,
    videoSize,
    "balanced",
  );

  canvas.style.position = "absolute";
  canvas.style.left = `${offsetX}px`;
  canvas.style.top = `${offsetY}px`;
  canvas.style.width = `${contentW}px`;
  canvas.style.height = `${contentH}px`;
  canvas.style.margin = "0";
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
}

/**
 * Positions a canvas for "balanced" fit (between contain and cover).
 * Touch mapping must use the same fit mode on the same element.
 */
export function useVideoFitCanvas(
  containerRef: React.RefObject<HTMLElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoSize: Size2D,
  fit: VideoFitMode,
  layoutKey: number,
): void {
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    if (fit !== "balanced") {
      resetCanvasLayout(canvas);
      return;
    }

    const update = () => applyBalancedLayout(container, canvas, videoSize);

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => {
      ro.disconnect();
      resetCanvasLayout(canvas);
    };
  }, [containerRef, canvasRef, fit, videoSize.width, videoSize.height, layoutKey]);
}
