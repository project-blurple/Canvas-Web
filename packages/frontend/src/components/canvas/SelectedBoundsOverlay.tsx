import { Point } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { PointerEvent, useMemo, useRef } from "react";
import { ViewBounds } from "@/util";

const OverlayReticleContainer = styled("div")`
  position: absolute;
  z-index: 1;
`;

const OverlayReticle = styled("img")`
  image-rendering: pixelated;
`;

const CornerHitTarget = styled("div")`
  position: absolute;
  z-index: 2;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type CornerKey = "top-left" | "top-right" | "bottom-left" | "bottom-right";

function getCornerCursor(corner: CornerKey): "nwse-resize" | "nesw-resize" {
  if (corner === "top-left" || corner === "bottom-right") {
    return "nwse-resize";
  }

  return "nesw-resize";
}

function getCornerHandleAnchor(point: Point, corner: CornerKey): Point {
  if (corner === "top-right") {
    return { x: point.x + 1, y: point.y };
  }

  if (corner === "bottom-left") {
    return { x: point.x, y: point.y + 1 };
  }

  if (corner === "bottom-right") {
    return { x: point.x + 1, y: point.y + 1 };
  }

  return point;
}

function resizeBoundsFromCorner({
  startBounds,
  corner,
  deltaX,
  deltaY,
  canvasWidth,
  canvasHeight,
  minWidth,
  minHeight,
}: {
  startBounds: ViewBounds;
  corner: CornerKey;
  deltaX: number;
  deltaY: number;
  canvasWidth: number;
  canvasHeight: number;
  minWidth: number;
  minHeight: number;
}): ViewBounds {
  let left = startBounds.left;
  let top = startBounds.top;
  let right = startBounds.right;
  let bottom = startBounds.bottom;

  if (corner === "top-left" || corner === "bottom-left") {
    left = clamp(
      Math.round(startBounds.left + deltaX),
      0,
      startBounds.right - minWidth,
    );
  }

  if (corner === "top-right" || corner === "bottom-right") {
    right = clamp(
      Math.round(startBounds.right + deltaX),
      startBounds.left + minWidth,
      canvasWidth,
    );
  }

  if (corner === "top-left" || corner === "top-right") {
    top = clamp(
      Math.round(startBounds.top + deltaY),
      0,
      startBounds.bottom - minHeight,
    );
  }

  if (corner === "bottom-left" || corner === "bottom-right") {
    bottom = clamp(
      Math.round(startBounds.bottom + deltaY),
      startBounds.top + minHeight,
      canvasHeight,
    );
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

export default function SelectedBoundsOverlay({
  canvasWidth,
  canvasHeight,
  canEdit,
  minHeight,
  minWidth,
  selectedBounds,
  reticleScale,
  reticleSize,
  setSelectedBounds,
  zoom,
}: {
  canvasWidth: number;
  canvasHeight: number;
  canEdit: boolean;
  minHeight: number;
  minWidth: number;
  selectedBounds: ViewBounds | null;
  reticleScale: number;
  reticleSize: number;
  setSelectedBounds: (value: ViewBounds) => void;
  zoom: number;
}) {
  const dragStateRef = useRef<{
    corner: CornerKey;
    pointerId: number;
    startBounds: ViewBounds;
    startClientX: number;
    startClientY: number;
  } | null>(null);

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
      point: corner.point,
      offset: calculateReticleOffsetForPoint(
        corner.point,
        reticleSize,
        reticleScale,
      ),
    }));
  }, [selectedBounds, reticleSize, reticleScale]);

  function handleCornerPointerDown(
    corner: CornerKey,
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (!canEdit) return;
    if (!selectedBounds) return;

    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      corner,
      pointerId: event.pointerId,
      startBounds: selectedBounds,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  }

  function handleCornerPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const deltaX = (event.clientX - dragState.startClientX) / zoom;
    const deltaY = (event.clientY - dragState.startClientY) / zoom;

    setSelectedBounds(
      resizeBoundsFromCorner({
        startBounds: dragState.startBounds,
        corner: dragState.corner,
        deltaX,
        deltaY,
        canvasWidth,
        canvasHeight,
        minWidth,
        minHeight,
      }),
    );
  }

  function handleCornerPointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
  }

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
      {selectedBoundsCorners.map((corner) => {
        const hitSize = 20 / zoom;
        const hitAnchor = getCornerHandleAnchor(
          corner.point,
          corner.key as CornerKey,
        );

        return (
          <CornerHitTarget
            key={`selected-bounds-corner-hit-${corner.key}`}
            onPointerDown={(event) =>
              handleCornerPointerDown(corner.key as CornerKey, event)
            }
            onPointerMove={handleCornerPointerMove}
            onPointerUp={handleCornerPointerUp}
            onPointerCancel={handleCornerPointerUp}
            style={{
              cursor:
                canEdit ? getCornerCursor(corner.key as CornerKey) : "default",
              pointerEvents: canEdit ? "auto" : "none",
              touchAction: "none",
              left: hitAnchor.x - hitSize / 2,
              top: hitAnchor.y - hitSize / 2,
              width: hitSize,
              height: hitSize,
            }}
          />
        );
      })}
      {selectedBoundsCorners.map((corner) => (
        <OverlayReticleContainer
          key={`selected-bounds-corner-${corner.key}`}
          style={{
            pointerEvents: "none",
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
