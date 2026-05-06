import type { CanvasInfo } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Scan } from "lucide-react";
import NumberField from "@/components/NumberField";
import type { ViewBounds } from "@/util";

const minWidth = 1;
const minHeight = 1;

const CoordinateRangeWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;

  > svg {
    flex: 0 0 auto;
  }
`;
const CoordinateInputWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  width: 100%;
`;

interface ComplexSearchBoundsSelectProps {
  canvas: CanvasInfo;
  selectedBounds: ViewBounds | null;
  setSelectedBounds: (bounds: ViewBounds) => void;
  disabled: boolean;
}

export default function ComplexSearchBoundsSelect({
  canvas,
  selectedBounds,
  setSelectedBounds,
  disabled,
}: ComplexSearchBoundsSelectProps) {
  const [startX, startY] = canvas.startCoordinates;

  const displayBounds =
    selectedBounds ?
      {
        left: selectedBounds.left + startX,
        top: selectedBounds.top + startY,
        right: selectedBounds.right + startX,
        bottom: selectedBounds.bottom + startY,
      }
    : null;

  return (
    <CoordinateRangeWrapper>
      <CoordinateInputWrapper>
        <NumberField
          label="Left (x)"
          value={displayBounds?.left ?? startX}
          min={startX}
          max={
            selectedBounds?.right != null ?
              selectedBounds.right + startX - minWidth
            : canvas.width + startX - minWidth
          }
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds) return;
            if (value === null) return;
            setSelectedBounds({ ...selectedBounds, left: value - startX });
          }}
          disabled={disabled}
        />
        <NumberField
          label="Top (y)"
          value={displayBounds?.top ?? startY}
          min={startY}
          max={
            selectedBounds?.bottom != null ?
              selectedBounds.bottom + startY - minHeight
            : canvas.height + startY - minHeight
          }
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds) return;
            if (value === null) return;
            setSelectedBounds({ ...selectedBounds, top: value - startY });
          }}
          disabled={disabled}
        />
      </CoordinateInputWrapper>
      <Scan />
      <CoordinateInputWrapper>
        <NumberField
          label="Right (x)"
          value={displayBounds?.right ?? startX}
          min={
            selectedBounds?.left != null ?
              selectedBounds.left + startX + minWidth
            : startX + minWidth
          }
          max={canvas.width + startX}
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds) return;
            if (value === null) return;
            setSelectedBounds({ ...selectedBounds, right: value - startX });
          }}
          disabled={disabled}
        />
        <NumberField
          label="Bottom (y)"
          value={displayBounds?.bottom ?? startY}
          min={
            selectedBounds?.top != null ?
              selectedBounds.top + startY + minHeight
            : startY + minHeight
          }
          max={canvas.height + startY}
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds) return;
            if (value === null) return;
            setSelectedBounds({ ...selectedBounds, bottom: value - startY });
          }}
          disabled={disabled}
        />
      </CoordinateInputWrapper>
    </CoordinateRangeWrapper>
  );
}
