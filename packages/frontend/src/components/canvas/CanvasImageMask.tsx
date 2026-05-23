import type { Point } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useMemo } from "react";

const MaskOverlay = styled("svg")`
  inset: 0;
  pointer-events: none;
  position: absolute;
`;

interface CanvasImageMaskProps {
  canvasWidth: number;
  canvasHeight: number;
  coordinates: Point[];
}

export default function CanvasImageMask({
  canvasWidth,
  canvasHeight,
  coordinates,
}: CanvasImageMaskProps) {
  const maskedCoordinates = useMemo(() => {
    const seenCoordinates = new Set<string>();

    return coordinates.flatMap((point) => {
      const x = Math.floor(point.x);
      const y = Math.floor(point.y);

      if (x < 0 || y < 0 || x >= canvasWidth || y >= canvasHeight) {
        return [];
      }

      const key = `${x}:${y}`;
      if (seenCoordinates.has(key)) return [];
      seenCoordinates.add(key);

      return [{ key, x, y }];
    });
  }, [canvasHeight, canvasWidth, coordinates]);

  if (maskedCoordinates.length === 0) return null;

  return (
    <MaskOverlay
      aria-hidden
      focusable="false"
      height={canvasHeight}
      preserveAspectRatio="none"
      role="presentation"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      width={canvasWidth}
    >
      {maskedCoordinates.map((coordinate) => (
        <rect
          key={coordinate.key}
          fill="var(--discord-legacy-not-quite-black)"
          height={1}
          shapeRendering="crispEdges"
          width={1}
          x={coordinate.x}
          y={coordinate.y}
        />
      ))}
    </MaskOverlay>
  );
}
