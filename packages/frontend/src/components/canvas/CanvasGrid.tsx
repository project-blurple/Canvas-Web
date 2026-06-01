import { styled } from "@mui/material";

const Grid = styled("svg")`
  height: 100%;
  pointer-events: none;
  position: absolute;
  width: 100%;
  inset: 0;
  z-index: 0;
  mix-blend-mode: difference;
  color: white;
`;

export function CanvasGrid() {
  return (
    <Grid xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path
            d="M 0 0 L 1 0 L 1 1 L 0 1 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.01"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </Grid>
  );
}
