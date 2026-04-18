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
  selectedBounds,
  reticleScale,
  reticleSize,
}: {
  selectedBounds: ViewBounds | null;
  reticleScale: number;
  reticleSize: number;
}) {
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
