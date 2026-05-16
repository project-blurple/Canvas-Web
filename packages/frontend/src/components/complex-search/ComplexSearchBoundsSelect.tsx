import type { CanvasInfo } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Scan } from "lucide-react";
import NumberField from "@/components/NumberField";
import { COMPLEX_SEARCH_BOUNDS_MIN_SIZE } from "@/constants/selectedBounds";
import type { ViewBounds } from "@/util";

const CoordinateRangeWrapper = styled("fieldset")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;

  > svg {
    flex: 0 0 auto;
  }
`;
const CoordinateInputWrapper = styled("div")`
  align-items: baseline;
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  width: 100%;
  margin-block: 1em;
`;

interface ComplexSearchBoundsSelectProps extends React.ComponentPropsWithRef<
  typeof CoordinateRangeWrapper
> {
  canvas: CanvasInfo;
  selectedBounds: ViewBounds | null;
  setSelectedBounds: (bounds: ViewBounds) => void;
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
  ...props
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
    <CoordinateRangeWrapper disabled={disabled} {...props}>
      <CoordinateInputWrapper>
        <NumberField
          disabled={disabled}
          label={
            <>
              Left (<var>x</var>)
            </>
          }
          placeholder="x"
          max={
            selectedBounds?.right != null ?
              selectedBounds.right +
              startX -
              COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width
            : canvas.width + startX - COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width
          }
          min={startX}
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                left: value - startX,
              }),
            );
          }}
          required
          value={displayBounds?.left ?? startX}
        />
        <NumberField
          disabled={disabled}
          label={
            <>
              Top (<var>y</var>)
            </>
          }
          placeholder="y"
          max={
            selectedBounds?.bottom != null ?
              selectedBounds.bottom +
              startY -
              COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height
            : canvas.height + startY - COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height
          }
          min={startY}
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                top: value - startY,
              }),
            );
          }}
          required
          value={displayBounds?.top ?? startY}
        />
      </CoordinateInputWrapper>
      <Scan size={24} />
      <CoordinateInputWrapper>
        <NumberField
          disabled={disabled}
          label={
            <>
              Right (<var>x</var>)
            </>
          }
          placeholder="x"
          max={canvas.width + startX - 1}
          min={
            selectedBounds?.left != null ?
              selectedBounds.left +
              startX +
              COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width -
              1
            : startX + COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width
          }
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                right: value - startX + 1,
              }),
            );
          }}
          required
          value={displayBounds?.right ?? startX}
        />
        <NumberField
          disabled={disabled}
          label={
            <>
              Bottom (<var>y</var>)
            </>
          }
          placeholder="y"
          max={canvas.height + startY - 1}
          min={
            selectedBounds?.top != null ?
              selectedBounds.top +
              startY +
              COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height -
              1
            : startY + COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height
          }
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                bottom: value - startY + 1,
              }),
            );
          }}
          required
          value={displayBounds?.bottom ?? startY}
        />
      </CoordinateInputWrapper>
    </CoordinateRangeWrapper>
  );
}
