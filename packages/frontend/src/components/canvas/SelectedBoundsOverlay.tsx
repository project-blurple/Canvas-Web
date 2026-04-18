import { Point } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useMemo } from "react";
import { ViewBounds } from "@/util";

const OverlayReticleContainer = styled("div")`
  pointer-events: none;
  position: absolute;
  z-index: 1;
`;

const OverlayReticle = styled("img")`
  image-rendering: pixelated;
`;

const OverlayShade = styled("svg")`
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 1;
`;

const OverlayDesaturateShade = styled("svg")`
  inset: 0;
  mix-blend-mode: saturation;
  pointer-events: none;
  position: absolute;
  z-index: 1;
`;

function calculateReticleOffsetForPoint(
  point: Point,
  reticleSize: number,
  reticleScale: number,
): Point {
  return {
    x: (point.x - (reticleSize - 1) / 2) / reticleScale,
    y: (point.y - (reticleSize - 1) / 2) / reticleScale,
  };
}

export default function SelectedBoundsOverlay({
  canvasWidth,
  canvasHeight,
  selectedBounds,
  reticleScale,
  reticleSize,
}: {
  canvasWidth: number;
  canvasHeight: number;
  selectedBounds: ViewBounds | null;
  reticleScale: number;
  reticleSize: number;
}) {
  const overlayCutoutPath = useMemo(() => {
    if (!selectedBounds) return null;

    const left = Math.max(0, Math.min(canvasWidth, selectedBounds.left));
    const top = Math.max(0, Math.min(canvasHeight, selectedBounds.top));
    const right = Math.max(left, Math.min(canvasWidth, selectedBounds.right));
    const bottom = Math.max(top, Math.min(canvasHeight, selectedBounds.bottom));

    return `M0 0H${canvasWidth}V${canvasHeight}H0Z M${left} ${top}H${right}V${bottom}H${left}Z`;
  }, [canvasWidth, canvasHeight, selectedBounds]);

  const selectedBoundsCorners = useMemo(() => {
    if (!selectedBounds) return [];

    const right = Math.max(selectedBounds.left, selectedBounds.right - 1);
    const bottom = Math.max(selectedBounds.top, selectedBounds.bottom - 1);
    const corners = [
      {
        key: "top-left",
        point: { x: selectedBounds.left, y: selectedBounds.top },
      },
      {
        key: "top-right",
        point: { x: right, y: selectedBounds.top },
      },
      {
        key: "bottom-left",
        point: { x: selectedBounds.left, y: bottom },
      },
      {
        key: "bottom-right",
        point: { x: right, y: bottom },
      },
    ];

    return corners.map((corner) => ({
      key: corner.key,
      offset: calculateReticleOffsetForPoint(
        corner.point,
        reticleSize,
        reticleScale,
      ),
    }));
  }, [selectedBounds, reticleSize, reticleScale]);

  return (
    <>
      {overlayCutoutPath && (
        <OverlayShade
          aria-hidden
          width={canvasWidth}
          height={canvasHeight}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        >
          <path
            d={overlayCutoutPath}
            fill="#000000"
            fillOpacity={0.25}
            fillRule="evenodd"
          />
        </OverlayShade>
      )}
      {overlayCutoutPath && (
        <OverlayDesaturateShade
          aria-hidden
          width={canvasWidth}
          height={canvasHeight}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        >
          <path
            d={overlayCutoutPath}
            fill="#808080"
            fillRule="evenodd"
            fillOpacity={0.25}
          />
        </OverlayDesaturateShade>
      )}
      {selectedBoundsCorners.map((corner) => (
        <OverlayReticleContainer
          key={`selected-bounds-corner-${corner.key}`}
          style={{
            scale: reticleScale,
            transform: `translate(${corner.offset.x}px, ${corner.offset.y}px)`,
          }}
        >
          <OverlayReticle
            src="/images/reticle.png"
            alt=""
            aria-hidden
            style={{
              width: reticleSize,
              height: reticleSize,
              minWidth: reticleSize,
              minHeight: reticleSize,
            }}
          />
        </OverlayReticleContainer>
      ))}
    </>
  );
}
