import { Point } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Dispatch, PointerEvent, SetStateAction, useMemo, useRef } from "react";
import { clamp, ViewBounds } from "@/util";

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

type CornerKey = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type EdgeKey = "top" | "right" | "bottom" | "left";
type HandleKey = CornerKey | EdgeKey;

const EDGE_HIT_TARGET_THICKNESS = 14;
const CORNER_HIT_TARGET_SIZE = 20;

function getCornerCursor(corner: CornerKey): "nwse-resize" | "nesw-resize" {
  if (corner === "top-left" || corner === "bottom-right") {
    return "nwse-resize";
  }

  return "nesw-resize";
}

function getCornerRotation(corner: CornerKey): number {
  if (corner === "top-right") return 90;
  if (corner === "bottom-right") return 180;
  if (corner === "bottom-left") return -90;

  return 0;
}

function getEdgeCursor(edge: EdgeKey): "ns-resize" | "ew-resize" {
  if (edge === "top" || edge === "bottom") {
    return "ns-resize";
  }

  return "ew-resize";
}

function getEdgeRotation(edge: EdgeKey): number {
  if (edge === "top") return 90;
  if (edge === "right") return 180;
  if (edge === "bottom") return -90;

  return 0;
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

function resizeBoundsFromHandle({
  startBounds,
  handle,
  deltaX,
  deltaY,
  canvasWidth,
  canvasHeight,
  minWidth,
  minHeight,
}: {
  startBounds: ViewBounds;
  handle: HandleKey;
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

  if (handle === "top-left" || handle === "bottom-left" || handle === "left") {
    left = clamp(
      Math.round(startBounds.left + deltaX),
      0,
      startBounds.right - minWidth,
    );
  }

  if (
    handle === "top-right" ||
    handle === "bottom-right" ||
    handle === "right"
  ) {
    right = clamp(
      Math.round(startBounds.right + deltaX),
      startBounds.left + minWidth,
      canvasWidth,
    );
  }

  if (handle === "top-left" || handle === "top-right" || handle === "top") {
    top = clamp(
      Math.round(startBounds.top + deltaY),
      0,
      startBounds.bottom - minHeight,
    );
  }

  if (
    handle === "bottom-left" ||
    handle === "bottom-right" ||
    handle === "bottom"
  ) {
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

function renderOverlayShades({
  canvasWidth,
  canvasHeight,
  overlayCutoutPath,
}: {
  canvasWidth: number;
  canvasHeight: number;
  overlayCutoutPath: string | null;
}) {
  if (!overlayCutoutPath) return null;

  return (
    <>
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
    </>
  );
}

function renderEdgeHitTargets({
  canEdit,
  edgeThickness,
  edges,
  handleHandlePointerDown,
  handleHandlePointerMove,
  handleHandlePointerUp,
}: {
  canEdit: boolean;
  edgeThickness: number;
  edges: Array<{
    key: EdgeKey;
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
  handleHandlePointerDown: (
    handle: HandleKey,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
  handleHandlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handleHandlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return edges.map((edge) => (
    <CornerHitTarget
      key={edge.key}
      onPointerDown={(event) => handleHandlePointerDown(edge.key, event)}
      onPointerMove={handleHandlePointerMove}
      onPointerUp={handleHandlePointerUp}
      onPointerCancel={handleHandlePointerUp}
      style={{
        cursor: canEdit ? getEdgeCursor(edge.key) : "default",
        pointerEvents: canEdit ? "auto" : "none",
        touchAction: "none",
        left: edge.left - edgeThickness / 2,
        top: edge.top - edgeThickness / 2,
        width:
          edge.key === "top" || edge.key === "bottom" ?
            edge.width + edgeThickness
          : edgeThickness,
        height:
          edge.key === "left" || edge.key === "right" ?
            edge.height + edgeThickness
          : edgeThickness,
      }}
    />
  ));
}

function renderCornerHitTargets({
  canEdit,
  corners,
  handleHandlePointerDown,
  handleHandlePointerMove,
  handleHandlePointerUp,
  zoom,
}: {
  canEdit: boolean;
  corners: Array<{
    key: CornerKey;
    point: Point;
  }>;
  handleHandlePointerDown: (
    handle: HandleKey,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
  handleHandlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handleHandlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  zoom: number;
}) {
  return corners.map((corner) => {
    const hitSize = CORNER_HIT_TARGET_SIZE / zoom;
    const hitAnchor = getCornerHandleAnchor(corner.point, corner.key);

    return (
      <CornerHitTarget
        key={corner.key}
        onPointerDown={(event) => handleHandlePointerDown(corner.key, event)}
        onPointerMove={handleHandlePointerMove}
        onPointerUp={handleHandlePointerUp}
        onPointerCancel={handleHandlePointerUp}
        style={{
          cursor: canEdit ? getCornerCursor(corner.key) : "default",
          pointerEvents: canEdit ? "auto" : "none",
          touchAction: "none",
          left: hitAnchor.x - hitSize / 2,
          top: hitAnchor.y - hitSize / 2,
          width: hitSize,
          height: hitSize,
        }}
      />
    );
  });
}

function renderCornerReticles({
  corners,
  reticleScale,
  reticleSize,
}: {
  corners: Array<{
    key: CornerKey;
    offset: Point;
  }>;
  reticleScale: number;
  reticleSize: number;
}) {
  return corners.map((corner) => (
    <OverlayReticleContainer
      key={`selected-bounds-corner-${corner.key}`}
      style={{
        pointerEvents: "none",
        scale: reticleScale,
        transform: `translate(${corner.offset.x}px, ${corner.offset.y}px)`,
      }}
    >
      <OverlayReticle
        src="/images/boundsCorner.png"
        alt=""
        aria-hidden
        style={{
          transform: `rotate(${getCornerRotation(corner.key)}deg)`,
          width: reticleSize,
          height: reticleSize,
          minWidth: reticleSize,
          minHeight: reticleSize,
        }}
      />
    </OverlayReticleContainer>
  ));
}

function renderEdgeReticles({
  edges,
  reticleScale,
  reticleSize,
}: {
  edges: Array<{
    key: EdgeKey;
    offset: Point;
  }>;
  reticleScale: number;
  reticleSize: number;
}) {
  return edges.map((edge) => (
    <OverlayReticleContainer
      key={`selected-bounds-edge-${edge.key}`}
      style={{
        pointerEvents: "none",
        scale: reticleScale,
        transform: `translate(${edge.offset.x}px, ${edge.offset.y}px)`,
      }}
    >
      <OverlayReticle
        src="/images/boundsEdge.png"
        alt=""
        aria-hidden
        style={{
          transform: `rotate(${getEdgeRotation(edge.key)}deg)`,
          width: reticleSize,
          height: reticleSize,
          minWidth: reticleSize,
          minHeight: reticleSize,
        }}
      />
    </OverlayReticleContainer>
  ));
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
  setSelectedBounds: Dispatch<SetStateAction<ViewBounds>>;
  zoom: number;
}) {
  const dragStateRef = useRef<{
    handle: HandleKey;
    pointerId: number;
    startBounds: ViewBounds;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  const overlayCutoutPath = useMemo(() => {
    if (!selectedBounds) return null;

    const left = clamp(selectedBounds.left, 0, canvasWidth);
    const top = clamp(selectedBounds.top, 0, canvasHeight);
    const right = clamp(selectedBounds.right, left, canvasWidth);
    const bottom = clamp(selectedBounds.bottom, top, canvasHeight);

    return `M0 0H${canvasWidth}V${canvasHeight}H0Z M${left} ${top}H${right}V${bottom}H${left}Z`;
  }, [canvasWidth, canvasHeight, selectedBounds]);

  const selectedBoundsCorners = useMemo(() => {
    if (!selectedBounds) return [];

    const right = Math.max(selectedBounds.left, selectedBounds.right - 1);
    const bottom = Math.max(selectedBounds.top, selectedBounds.bottom - 1);
    const corners: Array<{
      key: CornerKey;
      point: Point;
    }> = [
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

  const selectedBoundsEdges = useMemo(() => {
    if (!selectedBounds) return [];

    return [
      {
        key: "top",
        left: selectedBounds.left,
        top: selectedBounds.top,
        width: selectedBounds.width,
        height: 0,
      },
      {
        key: "right",
        left: selectedBounds.right,
        top: selectedBounds.top,
        width: 0,
        height: selectedBounds.height,
      },
      {
        key: "bottom",
        left: selectedBounds.left,
        top: selectedBounds.bottom,
        width: selectedBounds.width,
        height: 0,
      },
      {
        key: "left",
        left: selectedBounds.left,
        top: selectedBounds.top,
        width: 0,
        height: selectedBounds.height,
      },
    ] satisfies Array<{
      key: EdgeKey;
      left: number;
      top: number;
      width: number;
      height: number;
    }>;
  }, [selectedBounds]);

  const selectedBoundsEdgeReticles = useMemo(() => {
    if (!selectedBounds) return [];

    const right = Math.max(selectedBounds.left, selectedBounds.right - 1);
    const bottom = Math.max(selectedBounds.top, selectedBounds.bottom - 1);
    const centerX = selectedBounds.left + (selectedBounds.width - 1) / 2;
    const centerY = selectedBounds.top + (selectedBounds.height - 1) / 2;

    const edges: Array<{
      key: EdgeKey;
      point: Point;
    }> = [
      {
        key: "top",
        point: { x: centerX, y: selectedBounds.top },
      },
      {
        key: "right",
        point: { x: right, y: centerY },
      },
      {
        key: "bottom",
        point: { x: centerX, y: bottom },
      },
      {
        key: "left",
        point: { x: selectedBounds.left, y: centerY },
      },
    ];

    return edges.map((edge) => ({
      key: edge.key,
      point: edge.point,
      offset: calculateReticleOffsetForPoint(
        edge.point,
        reticleSize,
        reticleScale,
      ),
    }));
  }, [selectedBounds, reticleSize, reticleScale]);

  function handleHandlePointerDown(
    handle: HandleKey,
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (!canEdit) return;
    if (!selectedBounds) return;

    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      handle,
      pointerId: event.pointerId,
      startBounds: selectedBounds,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  }

  function handleHandlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const deltaX = (event.clientX - dragState.startClientX) / zoom;
    const deltaY = (event.clientY - dragState.startClientY) / zoom;

    setSelectedBounds(
      resizeBoundsFromHandle({
        startBounds: dragState.startBounds,
        handle: dragState.handle,
        deltaX,
        deltaY,
        canvasWidth,
        canvasHeight,
        minWidth,
        minHeight,
      }),
    );
  }

  function handleHandlePointerUp(event: PointerEvent<HTMLDivElement>) {
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
      {renderOverlayShades({
        canvasWidth,
        canvasHeight,
        overlayCutoutPath,
      })}
      {renderEdgeHitTargets({
        canEdit,
        edgeThickness: EDGE_HIT_TARGET_THICKNESS / zoom,
        edges: selectedBoundsEdges,
        handleHandlePointerDown,
        handleHandlePointerMove,
        handleHandlePointerUp,
      })}
      {renderCornerHitTargets({
        canEdit,
        corners: selectedBoundsCorners,
        handleHandlePointerDown,
        handleHandlePointerMove,
        handleHandlePointerUp,
        zoom,
      })}
      {renderCornerReticles({
        corners: selectedBoundsCorners,
        reticleScale,
        reticleSize,
      })}
      {renderEdgeReticles({
        edges: selectedBoundsEdgeReticles,
        reticleScale,
        reticleSize,
      })}
    </>
  );
}
