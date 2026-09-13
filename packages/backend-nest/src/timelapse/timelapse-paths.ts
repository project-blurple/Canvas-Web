import path from "node:path";

export const TIMELAPSE_VIDEO_ROOT = path.resolve(
  process.cwd(),
  "static",
  "timelapse",
);

export const TIMELAPSE_END_CARD_IMAGE_PATH = path.resolve(
  process.cwd(),
  "static",
  "constant",
  "timelapse-end-card.png",
);

export function getTimelapseCanvasDirectory(
  videoRoot: string,
  canvasId: number,
): string {
  return path.resolve(videoRoot, String(canvasId));
}

export function getTimelapseVideoPath(
  videoRoot: string,
  canvasId: number,
  filename: string,
): string {
  return path.resolve(
    getTimelapseCanvasDirectory(videoRoot, canvasId),
    filename,
  );
}
