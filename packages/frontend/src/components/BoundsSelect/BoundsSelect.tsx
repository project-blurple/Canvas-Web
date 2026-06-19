import type { CanvasInfo } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Scan } from "lucide-react";
import NumberField from "@/components/NumberField";
import { useSelectedBoundsContext } from "@/contexts/SelectedBoundsContext";
import type { ViewBounds } from "@/util";

const CoordinateRangeWrapper = styled("fieldset")`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
  justify-content: center;
  width: 100%;

  > svg {
    flex: 0 0 auto;
  }
`;
const CoordinateInputWrapper = styled("div")`
  align-items: baseline;
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  width: fit-content;
`;

interface BoundsSelectProps extends React.ComponentPropsWithRef<
  typeof CoordinateRangeWrapper
> {
  canvas: CanvasInfo;
  selectedBounds: ViewBounds | null;
  setSelectedBounds: (bounds: ViewBounds) => void;
  showFrameButton?: boolean;
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

export default function BoundsSelect({
  canvas,
  selectedBounds,
  setSelectedBounds,
  showFrameButton = true,
  disabled,
  ...props
}: BoundsSelectProps) {
  const [startX, startY] = canvas.startCoordinates;
  const { minWidth, minHeight } = useSelectedBoundsContext();

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
    <CoordinateRangeWrapper disabled={disabled} {...props}>
      <CoordinateInputWrapper>
        <NumberField
          disabled={disabled}
          label={
            <>
              Left (<var>x</var>)
            </>
          }
          max={
            selectedBounds?.right != null ?
              selectedBounds.right + startX - minWidth + 1
            : canvas.width + startX - minWidth + 1
          }
          min={startX}
          name="x1"
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                left: value - startX,
              }),
            );
          }}
          placeholder="x"
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
          max={
            selectedBounds?.bottom != null ?
              selectedBounds.bottom + startY - minHeight + 1
            : canvas.height + startY - minHeight + 1
          }
          min={startY}
          name="y1"
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                top: value - startY,
              }),
            );
          }}
          placeholder="y"
          required
          value={displayBounds?.top ?? startY}
        />
      </CoordinateInputWrapper>
      {
        showFrameButton && <Scan size={24} /> // This will eventually be a button that can used to select bounds via an existing frame
      }
      <CoordinateInputWrapper>
        <NumberField
          disabled={disabled}
          label={
            <>
              Right (<var>x</var>)
            </>
          }
          max={canvas.width + startX - 1}
          min={
            selectedBounds?.left != null ?
              selectedBounds.left + startX + minWidth - 1
            : startX + minWidth
          }
          name="x2"
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                right: value - startX,
              }),
            );
          }}
          placeholder="x"
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
          max={canvas.height + startY - 1}
          min={
            selectedBounds?.top != null ?
              selectedBounds.top + startY + minHeight - 1
            : startY + minHeight
          }
          name="y2"
          onValueChange={(value: number | null) => {
            if (!selectedBounds || value === null) return;
            setSelectedBounds(
              withDerivedDimensions({
                ...selectedBounds,
                bottom: value - startY,
              }),
            );
          }}
          placeholder="y"
          required
          value={displayBounds?.bottom ?? startY}
        />
      </CoordinateInputWrapper>
    </CoordinateRangeWrapper>
  );
}
