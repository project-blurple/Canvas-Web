"use client";

import type { Point } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useMemo } from "react";
import { useCanvasViewContext, useSelectedColorContext } from "@/contexts";

const ReticleWrapper = styled("div")`
  pointer-events: none;
  position: absolute;
  z-index: 1;
`;

const Reticle = styled("img")`
  image-rendering: pixelated;
`;

const PreviewPixel = styled("div")`
  position: absolute;
`;

const RETICLE_ORIGINAL_SCALE = 10;
const RETICLE_ORIGINAL_SIZE = 14;
const RETICLE_SIZE = RETICLE_ORIGINAL_SIZE * 10;
const RETICLE_SCALE = 1 / (RETICLE_ORIGINAL_SCALE * 10);
const PREVIEW_PIXEL_SIZE = 0.8 * RETICLE_ORIGINAL_SCALE * 10;

function calculateReticleOffset(coords: Point | null): Point {
  if (!coords) return { x: 0, y: 0 };

  return {
    x: (coords.x - (RETICLE_SIZE - 1) / 2) / RETICLE_SCALE,
    y: (coords.y - (RETICLE_SIZE - 1) / 2) / RETICLE_SCALE,
  };
}

interface ReticleOverlayProps {
  showReticle: boolean;
}

export default function ReticleOverlay({ showReticle }: ReticleOverlayProps) {
  const { color } = useSelectedColorContext();
  const { coords, isReticleVisible } = useCanvasViewContext();

  const reticleOffset = useMemo(() => calculateReticleOffset(coords), [coords]);

  if (!showReticle || !isReticleVisible) return null;

  return (
    <ReticleWrapper
      style={{
        scale: RETICLE_SCALE,
        ...(coords && {
          transform: `translate(${reticleOffset.x}px, ${reticleOffset.y}px)`,
        }),
      }}
    >
      {color && (
        <PreviewPixel
          style={{
            width: PREVIEW_PIXEL_SIZE,
            height: PREVIEW_PIXEL_SIZE,
            top: (RETICLE_SIZE - PREVIEW_PIXEL_SIZE) / 2,
            left: (RETICLE_SIZE - PREVIEW_PIXEL_SIZE) / 2,
            backgroundColor: `rgba(${color.rgba.join()})`,
          }}
        />
      )}
      <Reticle
        src="/images/reticle.png"
        alt="Reticle"
        className="reticle"
        style={{
          width: RETICLE_SIZE,
          height: RETICLE_SIZE,
          minWidth: RETICLE_SIZE,
          minHeight: RETICLE_SIZE,
        }}
      />
    </ReticleWrapper>
  );
}
