"use client";

import {
  useCanvasContext,
  useCanvasViewContext,
  useImageOverlayContext,
  useSelectedBoundsContext,
} from "@/contexts";
import ImageOverlay from "./ImageOverlay";
import SelectedBoundsOverlay from "./SelectedBoundsOverlay";

const RETICLE_ORIGINAL_SCALE = 10;
const RETICLE_ORIGINAL_SIZE = 14;
const RETICLE_SIZE = RETICLE_ORIGINAL_SIZE * 10;
const RETICLE_SCALE = 1 / (RETICLE_ORIGINAL_SCALE * 10);

export default function CanvasOverlays() {
  const { canvas } = useCanvasContext();
  const { zoom } = useCanvasViewContext();
  const {
    imageOverlay,
    showOverlay: showImageOverlay,
    topLeftCoordinates,
  } = useImageOverlayContext();
  const {
    canEdit,
    minHeight,
    minWidth,
    selectedBounds,
    showSelectedBounds,
    setSelectedBounds,
  } = useSelectedBoundsContext();

  return (
    <div
      aria-hidden
      style={{
        inset: 0,
        pointerEvents: "none",
        position: "absolute",
        zIndex: 1,
      }}
    >
      {showSelectedBounds && (
        <SelectedBoundsOverlay
          canvasWidth={canvas.width}
          canvasHeight={canvas.height}
          canEdit={canEdit}
          minHeight={minHeight}
          minWidth={minWidth}
          selectedBounds={selectedBounds}
          reticleScale={RETICLE_SCALE}
          reticleSize={RETICLE_SIZE}
          setSelectedBounds={setSelectedBounds}
          zoom={zoom}
        />
      )}
      {showImageOverlay && imageOverlay && (
        <ImageOverlay
          alt={imageOverlay.alt}
          canvasHeight={canvas.height}
          canvasWidth={canvas.width}
          file={imageOverlay.file}
          left={topLeftCoordinates.x}
          top={topLeftCoordinates.y}
        />
      )}
    </div>
  );
}
