import { styled } from "@mui/material";
import { useId } from "react";

const Svg = styled("svg")`
  color: oklch(1 0 0 / 90%);
  height: 100%;
  inset: 0;
  mix-blend-mode: difference;
  pointer-events: none;
  position: absolute;
  width: 100%;
  z-index: 0;
`;

interface PixelGridProps extends React.ComponentPropsWithRef<typeof Svg> {
  hidden?: boolean;
  zoom: number;
}

export function PixelGrid({ zoom, ...props }: PixelGridProps) {
  // Fully eyeballed this :)
  // The stroke width is thicker when zoomed out to keep the grid visible, but thins as you zoom.
  const gridStrokeWidth = ((5 - Math.log(zoom)) / 5) * 0.05;
  const gridId = useId();

  return (
    <Svg xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <pattern id={gridId} width="1" height="1" patternUnits="userSpaceOnUse">
          <rect
            x="0"
            y="0"
            width="1"
            height="1"
            fill="none"
            stroke="currentColor"
            strokeWidth={gridStrokeWidth}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${gridId})`} />
    </Svg>
  );
}
