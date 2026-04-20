import { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material/styles";
import { clamp, normalizeFrameBounds } from "@/util";

export const FRAME_FILL_RATIO = 0.9;

export type SourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const PreviewCanvas = styled("canvas")`
  border-radius: 0.375rem;
  image-rendering: pixelated;
  width: 100%;
`;

export function getFrameCropRect(
  frame: Frame,
  canvasWidth: number,
  canvasHeight: number,
  targetAspectRatio: number,
) {
  const bounds = normalizeFrameBounds(frame);
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;

  if (bounds.width === 0 || bounds.height === 0) {
    return null;
  }

  // Expand the frame bounds so the frame occupies ~90% of the resulting thumbnail.
  let cropWidth = bounds.width / FRAME_FILL_RATIO;
  let cropHeight = bounds.height / FRAME_FILL_RATIO;
  const frameAspectRatio = cropWidth / cropHeight;

  if (frameAspectRatio > targetAspectRatio) {
    cropHeight = cropWidth / targetAspectRatio;
  } else {
    cropWidth = cropHeight * targetAspectRatio;
  }

  // Keep the requested aspect ratio while fitting within canvas bounds.
  const fitScale = Math.min(
    1,
    canvasWidth / cropWidth,
    canvasHeight / cropHeight,
  );
  cropWidth *= fitScale;
  cropHeight *= fitScale;

  let cropX = centerX - cropWidth / 2;
  let cropY = centerY - cropHeight / 2;

  cropX = clamp(cropX, 0, canvasWidth - cropWidth);
  cropY = clamp(cropY, 0, canvasHeight - cropHeight);

  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

export function drawSourceRectToCanvas(
  targetCanvas: HTMLCanvasElement,
  sourceImage: CanvasImageSource,
  sourceRect: SourceRect,
  targetWidth: number,
  targetHeight: number,
) {
  const context = targetCanvas.getContext("2d");
  if (!context) return;

  targetCanvas.width = targetWidth;
  targetCanvas.height = targetHeight;

  context.clearRect(0, 0, targetWidth, targetHeight);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    sourceImage,
    sourceRect.x,
    sourceRect.y,
    sourceRect.width,
    sourceRect.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );
}
