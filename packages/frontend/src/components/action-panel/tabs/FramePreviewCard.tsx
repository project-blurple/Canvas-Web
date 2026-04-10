import { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import { useCanvasContext } from "@/contexts";

const FRAME_FILL_RATIO = 0.9;
const DESKTOP_THUMB_WIDTH = 1600;
const DESKTOP_THUMB_HEIGHT = 900;
const MOBILE_THUMB_WIDTH = 500;
const MOBILE_THUMB_HEIGHT = 500;

const CardBody = styled("div")`
  background: oklch(from var(--discord-white) l c h / 10%);
  border-radius: 0.5rem;
  cursor: pointer;
`;

const Thumbnail = styled("canvas", {
  shouldForwardProp: (prop) => prop !== "isMobile",
})<{ isMobile?: boolean }>`
  aspect-ratio: ${({ isMobile }) => (isMobile ? "1 / 1" : "16 / 9")};
  border-radius: 0.375rem;
  display: block;
  image-rendering: pixelated;
  width: 100%;
`;

const FrameTitle = styled("p")`
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
  padding: 0.25rem 0.5rem;
  white-space: nowrap;
`;

interface FramePreviewCardProps {
  frame: Frame;
  sourceImage: CanvasImageSource | null;
  isMobile?: boolean;
  onClick?: () => void;
}

export function normalizeFrameBounds(frame: Frame) {
  const left = Math.min(frame.x_0, frame.x_1);
  const right = Math.max(frame.x_0, frame.x_1);
  const top = Math.min(frame.y_0, frame.y_1);
  const bottom = Math.max(frame.y_0, frame.y_1);

  return {
    left,
    right,
    top,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function getFrameCropRect(
  frame: Frame,
  canvasWidth: number,
  canvasHeight: number,
  targetAspectRatio: number,
) {
  const bounds = normalizeFrameBounds(frame);
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;

  // Expand the frame bounds so the frame occupies ~90% of the resulting thumbnail.
  let cropWidth = bounds.width / FRAME_FILL_RATIO;
  let cropHeight = bounds.height / FRAME_FILL_RATIO;
  const frameAspectRatio = cropWidth / cropHeight;

  if (frameAspectRatio > targetAspectRatio) {
    cropHeight = cropWidth / targetAspectRatio;
  } else {
    cropWidth = cropHeight * targetAspectRatio;
  }

  // Keep a strict 16:9 crop while fitting within canvas bounds.
  const fitScale = Math.min(
    1,
    canvasWidth / cropWidth,
    canvasHeight / cropHeight,
  );
  cropWidth *= fitScale;
  cropHeight *= fitScale;

  let cropX = centerX - cropWidth / 2;
  let cropY = centerY - cropHeight / 2;

  cropX = Math.max(0, Math.min(cropX, canvasWidth - cropWidth));
  cropY = Math.max(0, Math.min(cropY, canvasHeight - cropHeight));

  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

export function FramePreviewCard({
  frame,
  sourceImage,
  isMobile,
  onClick,
}: FramePreviewCardProps) {
  const { canvas } = useCanvasContext();
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbWidth = isMobile ? MOBILE_THUMB_WIDTH : DESKTOP_THUMB_WIDTH;
  const thumbHeight = isMobile ? MOBILE_THUMB_HEIGHT : DESKTOP_THUMB_HEIGHT;
  const thumbAspectRatio = thumbWidth / thumbHeight;

  useEffect(() => {
    const thumbnailCanvas = thumbnailCanvasRef.current;
    if (!thumbnailCanvas || !sourceImage) return;
    if (canvas.width <= 0 || canvas.height <= 0) return;

    const context = thumbnailCanvas.getContext("2d");
    if (!context) return;

    const crop = getFrameCropRect(
      frame,
      canvas.width,
      canvas.height,
      thumbAspectRatio,
    );

    context.clearRect(0, 0, thumbWidth, thumbHeight);
    context.imageSmoothingEnabled = false;
    context.drawImage(
      sourceImage,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      thumbWidth,
      thumbHeight,
    );
  }, [
    frame,
    sourceImage,
    canvas.width,
    canvas.height,
    thumbAspectRatio,
    thumbHeight,
    thumbWidth,
  ]);

  return (
    <CardBody onClick={onClick}>
      <Thumbnail
        isMobile={isMobile}
        ref={thumbnailCanvasRef}
        width={thumbWidth}
        height={thumbHeight}
      />
      <FrameTitle>{frame.name}</FrameTitle>
    </CardBody>
  );
}
