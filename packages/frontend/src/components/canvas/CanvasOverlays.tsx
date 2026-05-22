"use client";

import {
  useCanvasContext,
  useCanvasViewContext,
  useSelectedBoundsContext,
} from "@/contexts";
import SelectedBoundsOverlay from "./SelectedBoundsOverlay";

const RETICLE_ORIGINAL_SCALE = 10;
const RETICLE_ORIGINAL_SIZE = 14;
const RETICLE_SIZE = RETICLE_ORIGINAL_SIZE * 10;
const RETICLE_SCALE = 1 / (RETICLE_ORIGINAL_SCALE * 10);

export default function CanvasOverlays() {
  const { canvas } = useCanvasContext();
  const { zoom } = useCanvasViewContext();
  const {
    canEdit,
    minHeight,
    minWidth,
    selectedBounds,
    showSelectedBounds,
    setSelectedBounds,
  } = useSelectedBoundsContext();

  return (
    <>
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
    </>
  );
}
