import type { CanvasInfo } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Scan } from "lucide-react";
import NumberField from "@/components/NumberField";
import { COMPLEX_SEARCH_BOUNDS_MIN_SIZE } from "@/constants/selectedBounds";
import type { ViewBounds } from "@/util";

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
  justify-content: center;
`;

interface ComplexSearchBoundsSelectProps {
  canvas: CanvasInfo;
  selectedBounds: ViewBounds | null;
  setSelectedBounds: (bounds: ViewBounds) => void;
  disabled: boolean;
}

function withDerivedDimensions(
  bounds: Pick<ViewBounds, "left" | "top" | "right" | "bottom">,
): ViewBounds {
  return {
    ...bounds,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
  };
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
        right: selectedBounds.right + startX - 1,
        bottom: selectedBounds.bottom + startY - 1,
      }
    : null;

  return (
    <CoordinateRangeWrapper>
      <CoordinateInputWrapper>
        <NumberField
          label={
            <>
              Left (<var>x</var>)
            </>
          }
          value={displayBounds?.left ?? startX}
          min={startX}
          max={
            selectedBounds?.right != null ?
              selectedBounds.right +
              startX -
              COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width
            : canvas.width + startX - COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width
          }
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                left: value - startX,
              }),
            );
          }}
          disabled={disabled}
        />
        <NumberField
          label={
            <>
              Top (<var>y</var>)
            </>
          }
          value={displayBounds?.top ?? startY}
          min={startY}
          max={
            selectedBounds?.bottom != null ?
              selectedBounds.bottom +
              startY -
              COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height
            : canvas.height + startY - COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height
          }
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                top: value - startY,
              }),
            );
          }}
          disabled={disabled}
        />
      </CoordinateInputWrapper>
      <Scan size={24} />
      {/* ^^ Potentially might make this a dropdown to select Frames in the future*/}
      <CoordinateInputWrapper>
        <NumberField
          label={
            <>
              Right (<var>x</var>)
            </>
          }
          value={displayBounds?.right ?? startX}
          min={
            selectedBounds?.left != null ?
              selectedBounds.left +
              startX +
              COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width -
              1
            : startX + COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width
          }
          max={canvas.width + startX - 1}
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                right: value - startX + 1,
              }),
            );
          }}
          disabled={disabled}
        />
        <NumberField
          label={
            <>
              Bottom (<var>y</var>)
            </>
          }
          value={displayBounds?.bottom ?? startY}
          min={
            selectedBounds?.top != null ?
              selectedBounds.top +
              startY +
              COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height -
              1
            : startY + COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height
          }
          max={canvas.height + startY - 1}
          size="small"
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                bottom: value - startY + 1,
              }),
            );
          }}
          disabled={disabled}
        />
      </CoordinateInputWrapper>
    </CoordinateRangeWrapper>
  );
}
