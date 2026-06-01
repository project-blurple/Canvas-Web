import { styled } from "@mui/material";

const Grid = styled("svg")`
  color: var(--discord-blurple);
  height: 100%;
  inset: 0;
  mix-blend-mode: difference;
  pointer-events: none;
  position: absolute;
  width: 100%;
  z-index: 0;
`;

interface CanvasGridProps extends React.SVGProps<SVGSVGElement> {
  zoom: number;
}

export function CanvasGrid({ zoom, ...props }: CanvasGridProps) {
  // Fully eyeballed this :)
  // The stroke width is thicker when zoomed out to keep the grid visible, but thins as you zoom.
  const gridStrokeWidth = ((5 - Math.log(zoom)) / 5) * 0.05;

  return (
    <Grid xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path
            d="M 0 0 L 1 0 L 1 1 L 0 1 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth={gridStrokeWidth}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </Grid>
  );
}
