export type ScreenOrientationMode = "auto" | "portrait" | "landscape";

export type StreamSize = { width: number; height: number };

export type SessionStreamViewState = {
  streamSize: StreamSize;
  orientationMode: ScreenOrientationMode;
};

export const DEFAULT_STREAM_SIZE: StreamSize = { width: 1080, height: 2340 };

export const DEFAULT_SESSION_STREAM_VIEW: SessionStreamViewState = {
  streamSize: DEFAULT_STREAM_SIZE,
  orientationMode: "auto",
};
