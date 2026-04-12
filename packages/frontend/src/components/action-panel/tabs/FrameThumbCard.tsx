import { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import { useCanvasContext } from "@/contexts";
import { clamp } from "@/util";

const FRAME_FILL_RATIO = 0.9;
const DESKTOP_THUMB_WIDTH = 1600;
const DESKTOP_THUMB_HEIGHT = 900;
const MOBILE_THUMB_WIDTH = 500;
const MOBILE_THUMB_HEIGHT = 500;

const CardBody = styled("div")`
  background-color: oklch(from var(--discord-white) l c h / 12%);
  border-radius: 0.5rem;
  transition: background-color var(--transition-duration-fast) ease;

  :hover {
    background-color: oklch(from var(--discord-white) l c h / 24%);
  }

  :active {
    background-color: oklch(from var(--discord-white) l c h / 6%);
  }
`;

const ThumbnailCanvas = styled("canvas")`
  border-radius: 0.375rem;
  display: block;
  image-rendering: pixelated;
  width: 100%;
`;

const DesktopThumbnailCanvas = styled(ThumbnailCanvas)`
  aspect-ratio: 16 / 9;

  ${({ theme }) => theme.breakpoints.down("md")} {
    display: none;
  }
`;

const MobileThumbnailCanvas = styled(ThumbnailCanvas)`
  aspect-ratio: 1 / 1;

  ${({ theme }) => theme.breakpoints.up("md")} {
    display: none;
  }
`;

const FrameTitle = styled("h3")`
  margin: 0;
  padding: 0.25rem 0.5rem;
  white-space: nowrap;
`;

interface FrameThumbCardProps {
  frame: Frame;
  sourceImage: CanvasImageSource | null;
}

export function normalizeFrameBounds(frame: Frame) {
  const left = Math.min(frame.x0, frame.x1);
  const right = Math.max(frame.x0, frame.x1);
  const top = Math.min(frame.y0, frame.y1);
  const bottom = Math.max(frame.y0, frame.y1);

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

  cropX = clamp(cropX, 0, canvasWidth - cropWidth);
  cropY = clamp(cropY, 0, canvasHeight - cropHeight);

  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

export function FrameThumbCard({ frame, sourceImage }: FrameThumbCardProps) {
  const { canvas } = useCanvasContext();
  const mobileCanvasRef = useRef<HTMLCanvasElement>(null);
  const desktopCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(
    function drawResponsiveThumbCanvases() {
      if (!sourceImage) return;
      if (canvas.width <= 0 || canvas.height <= 0) return;

      const drawThumbToCanvas = (
        thumbCanvas: HTMLCanvasElement | null,
        thumbWidth: number,
        thumbHeight: number,
      ) => {
        if (!thumbCanvas) return;
        const context = thumbCanvas.getContext("2d");
        if (!context) return;

        const crop = getFrameCropRect(
          frame,
          canvas.width,
          canvas.height,
          thumbWidth / thumbHeight,
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
      };

      drawThumbToCanvas(
        mobileCanvasRef.current,
        MOBILE_THUMB_WIDTH,
        MOBILE_THUMB_HEIGHT,
      );
      drawThumbToCanvas(
        desktopCanvasRef.current,
        DESKTOP_THUMB_WIDTH,
        DESKTOP_THUMB_HEIGHT,
      );
    },
    [frame, sourceImage, canvas.width, canvas.height],
  );

  return (
    <CardBody>
      <MobileThumbnailCanvas
        ref={mobileCanvasRef}
        width={MOBILE_THUMB_WIDTH}
        height={MOBILE_THUMB_HEIGHT}
        aria-label={`${frame.name} frame thumbnail`}
      />
      <DesktopThumbnailCanvas
        ref={desktopCanvasRef}
        width={DESKTOP_THUMB_WIDTH}
        height={DESKTOP_THUMB_HEIGHT}
        aria-label={`${frame.name} frame thumbnail`}
      />
      <FrameTitle>{frame.name}</FrameTitle>
    </CardBody>
  );
}
