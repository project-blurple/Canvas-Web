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
  return (
    <CoordinateRangeWrapper>
      <CoordinateInputWrapper>
        <NumberField
          label="Left (x)"
          value={selectedBounds?.left ?? 0}
          min={0}
          max={
            selectedBounds?.right ?
              selectedBounds.right - minWidth
            : canvas.width - 1 - minWidth
          }
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds) return;
            if (value === null) return;
            setSelectedBounds({ ...selectedBounds, left: value });
          }}
          disabled={disabled}
        />
        <NumberField
          label="Top (y)"
          value={selectedBounds?.top ?? 0}
          min={0}
          max={
            selectedBounds?.bottom ?
              selectedBounds.bottom - minHeight
            : canvas.height - 1 - minHeight
          }
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds) return;
            if (value === null) return;
            setSelectedBounds({ ...selectedBounds, top: value });
          }}
          disabled={disabled}
        />
      </CoordinateInputWrapper>
      <Scan />
      <CoordinateInputWrapper>
        <NumberField
          label="Right (x)"
          value={selectedBounds?.right ?? 0}
          min={selectedBounds?.left ? selectedBounds.left + minWidth : minWidth}
          max={canvas.width - 1}
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds) return;
            if (value === null) return;
            setSelectedBounds({ ...selectedBounds, right: value });
          }}
          disabled={disabled}
        />
        <NumberField
          label="Bottom (y)"
          value={selectedBounds?.bottom ?? 0}
          min={selectedBounds?.top ? selectedBounds.top + minHeight : minHeight}
          max={canvas.height - 1}
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds) return;
            if (value === null) return;
            setSelectedBounds({ ...selectedBounds, bottom: value });
          }}
          disabled={disabled}
        />
      </CoordinateInputWrapper>
    </CoordinateRangeWrapper>
  );
}
