import { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import { useCanvasContext } from "@/contexts";
import {
  drawSourceRectToCanvas,
  getFrameCropRect,
  PreviewCanvas,
} from "../../frames/FramePreview";

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

const DesktopThumbnailCanvas = styled(PreviewCanvas)`
  aspect-ratio: 16 / 9;

  ${({ theme }) => theme.breakpoints.down("md")} {
    display: none;
  }
`;

const MobileThumbnailCanvas = styled(PreviewCanvas)`
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

        const crop = getFrameCropRect(
          frame,
          canvas.width,
          canvas.height,
          thumbWidth / thumbHeight,
        );

        drawSourceRectToCanvas(
          thumbCanvas,
          sourceImage,
          crop,
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
        aria-hidden
      />
      <DesktopThumbnailCanvas
        ref={desktopCanvasRef}
        width={DESKTOP_THUMB_WIDTH}
        height={DESKTOP_THUMB_HEIGHT}
        aria-hidden
      />
      <FrameTitle>{frame.name}</FrameTitle>
    </CardBody>
  );
}
