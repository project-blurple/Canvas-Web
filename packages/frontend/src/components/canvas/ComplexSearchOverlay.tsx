"use client";

import type { PixelHistoryOverlayPixel } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { useCanvasContext } from "@/contexts";
import { usePalette } from "@/hooks";

const OverlayWrapper = styled("div")`
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 0;
`;

const OverlayShade = styled("svg")`
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 0;
`;

const OverlayDesaturateShade = styled("svg")`
  inset: 0;
  mix-blend-mode: saturation;
  pointer-events: none;
  position: absolute;
  z-index: 0;
`;

const OverlayCanvas = styled("canvas")`
  inset: 0;
  image-rendering: pixelated;
  pointer-events: none;
  position: absolute;
  z-index: 1;
`;

function renderOverlayShades({
  canvasWidth,
  canvasHeight,
}: {
  canvasWidth: number;
  canvasHeight: number;
}) {
  return (
    <>
      <OverlayShade
        aria-hidden
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      >
        <rect
          width={canvasWidth}
          height={canvasHeight}
          fill="#000000"
          fillOpacity={0.75}
        />
      </OverlayShade>
      <OverlayDesaturateShade
        aria-hidden
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      >
        <rect
          width={canvasWidth}
          height={canvasHeight}
          fill="oklch(32% 0 0deg)"
          fillOpacity={0.5}
        />
      </OverlayDesaturateShade>
    </>
  );
}

interface ComplexSearchOverlayProps {
  canvasHeight: number;
  canvasWidth: number;
  pixels: PixelHistoryOverlayPixel[] | null;
  visible: boolean;
}

export default function ComplexSearchOverlay({
  canvasHeight,
  canvasWidth,
  pixels,
  visible,
}: ComplexSearchOverlayProps) {
  const { canvas } = useCanvasContext();
  const { data: palette = [] } = usePalette(canvas.eventId ?? undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colorById = useMemo(
    () => new Map(palette.map((color) => [color.id, color] as const)),
    [palette],
  );

  useEffect(() => {
    const overlayCanvas = canvasRef.current;
    if (!overlayCanvas) return;

    overlayCanvas.width = canvasWidth;
    overlayCanvas.height = canvasHeight;

    const context = overlayCanvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!visible || !pixels || pixels.length === 0) return;

    for (const pixel of pixels) {
      const color = colorById.get(pixel.colorId);
      if (!color) continue;

      const [red, green, blue, alpha] = color.rgba;
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
      context.fillRect(pixel.x, pixel.y, 1, 1);
    }
  }, [canvasHeight, canvasWidth, colorById, pixels, visible]);

  if (!visible || !pixels || pixels.length === 0) return null;

  return (
    <OverlayWrapper aria-hidden>
      {renderOverlayShades({ canvasWidth, canvasHeight })}
      <OverlayCanvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
      />
    </OverlayWrapper>
  );
}
