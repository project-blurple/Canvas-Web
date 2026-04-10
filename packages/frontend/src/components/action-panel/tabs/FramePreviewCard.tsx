import { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import { useCanvasContext } from "@/contexts";

const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;
const THUMB_ASPECT_RATIO = THUMB_WIDTH / THUMB_HEIGHT;
const FRAME_FILL_RATIO = 0.9;

const CardBody = styled("div")`
  background: oklch(from var(--discord-white) l c h / 10%);
  border-radius: 0.5rem;
  cursor: pointer;
`;

const Thumbnail = styled("canvas")`
  aspect-ratio: 16 / 9;
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
  onClick?: () => void;
}

function normalizeFrame(frame: Frame) {
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
) {
  const bounds = normalizeFrame(frame);
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;

  // Expand the frame bounds so the frame occupies ~90% of the resulting thumbnail.
  let cropWidth = bounds.width / FRAME_FILL_RATIO;
  let cropHeight = bounds.height / FRAME_FILL_RATIO;
  const frameAspectRatio = cropWidth / cropHeight;

  if (frameAspectRatio > THUMB_ASPECT_RATIO) {
    cropHeight = cropWidth / THUMB_ASPECT_RATIO;
  } else {
    cropWidth = cropHeight * THUMB_ASPECT_RATIO;
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
  onClick,
}: FramePreviewCardProps) {
  const { canvas } = useCanvasContext();
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const thumbnailCanvas = thumbnailCanvasRef.current;
    if (!thumbnailCanvas || !sourceImage) return;
    if (canvas.width <= 0 || canvas.height <= 0) return;

    const context = thumbnailCanvas.getContext("2d");
    if (!context) return;

    const crop = getFrameCropRect(frame, canvas.width, canvas.height);

    context.clearRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);
    context.imageSmoothingEnabled = false;
    context.drawImage(
      sourceImage,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      THUMB_WIDTH,
      THUMB_HEIGHT,
    );
  }, [frame, sourceImage, canvas.width, canvas.height]);

  return (
    <CardBody onClick={onClick}>
      <Thumbnail
        ref={thumbnailCanvasRef}
        width={THUMB_WIDTH}
        height={THUMB_HEIGHT}
      />
      <FrameTitle>{frame.name}</FrameTitle>
    </CardBody>
  );
}
