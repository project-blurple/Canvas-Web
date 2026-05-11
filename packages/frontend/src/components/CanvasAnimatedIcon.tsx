"use client";

import { styled } from "@mui/material";
import type { CSSProperties } from "react";

type Tone = "primary" | "secondary";

const StyledSvg = styled("svg")`
  cursor: wait;
  display: inline-block;
  height: auto;
  color: var(--canvas-icon-primary, currentColor);
  width: 100%;
`;

const StyledSquare = styled("rect")<{ $tone: Tone }>`
  --index: 0;
  transform-box: fill-box;
  transform-origin: center center;
  fill: ${({ $tone }) =>
    $tone === "primary" ? "currentColor" : (
      "var(--canvas-icon-secondary, oklch(from currentColor l c h / 0.8))"
    )};

  animation: --rippleCycle 3000ms infinite;
  animation-delay: calc(var(--index) * 80ms);

  @keyframes --rippleCycle {
    0% {
      opacity: 0;
      transform: scale(0);
      animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    11% {
      opacity: 1;
      transform: scale(1.1);
      animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
    }

    16% {
      opacity: 1;
      transform: scale(1);
    }

    54% {
      opacity: 1;
      transform: scale(1);
      animation-timing-function: cubic-bezier(0.36, 0, 0.66, -0.56);
    }

    64% {
      opacity: 0;
      transform: scale(0);
    }

    100% {
      opacity: 0;
      transform: scale(0);
    }
  }
`;

interface Square {
  x: number;
  y: number;
  tone: Tone;
}

const squares = [
  { x: 8, y: 8, tone: "primary" },
  { x: 36, y: 8, tone: "primary" },
  { x: 8, y: 36, tone: "primary" },
  { x: 64, y: 8, tone: "secondary" },
  { x: 36, y: 36, tone: "secondary" },
  { x: 8, y: 64, tone: "secondary" },
  { x: 64, y: 36, tone: "primary" },
  { x: 36, y: 64, tone: "primary" },
  { x: 64, y: 64, tone: "primary" },
] as const satisfies Square[];

interface CanvasAnimatedIconStyle extends CSSProperties {
  "--canvas-icon-primary"?: string;
  "--canvas-icon-secondary"?: string;
}
interface CanvasAnimatedIconProps extends React.ComponentPropsWithRef<
  typeof StyledSvg
> {
  style?: CanvasAnimatedIconStyle;
}

export default function CanvasAnimatedIcon(props: CanvasAnimatedIconProps) {
  return (
    <StyledSvg role="progressbar" viewBox="0 0 96 96" {...props}>
      <title>Loading</title>
      {squares.map(({ x, y, tone }, index) => (
        <StyledSquare
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="24"
          height="24"
          rx="4"
          $tone={tone}
          style={{ "--index": index } as CSSProperties}
        />
      ))}
    </StyledSvg>
  );
}
