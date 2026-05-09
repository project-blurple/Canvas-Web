"use client";

import type { CSSProperties } from "react";
import { styled } from "@mui/material";

interface CanvasAnimatedIconStyle extends CSSProperties {
  "--canvas-icon-primary"?: string;
  "--canvas-icon-secondary"?: string;
}

type Tone = "primary" | "secondary";

const StyledWrapper = styled("div")`
  cursor: wait;
  display: inline-block;
  height: auto;
`;

const StyledSvg = styled("svg")`
  color: var(--canvas-icon-primary, currentColor);
  display: block;
  height: 100%;
  width: 100%;
`;

const StyledSquare = styled("rect")<{ $delayMs: number; $tone: Tone }>`
  transform-box: fill-box;
  transform-origin: center center;
  fill: ${({ $tone }) =>
    $tone === "primary" ? "currentColor" : (
      "var(--canvas-icon-secondary, oklch(from var(--discord-blurple) l c h / 0.8))"
    )};

  animation: rippleCycle 3000ms infinite;
  animation-delay: ${({ $delayMs }) => `${$delayMs}ms`};

  @keyframes rippleCycle {
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
  index: number;
  x: number;
  y: number;
  tone: Tone;
  delayMs: number;
}

const SQUARES = [
  { index: 0, x: 8, y: 8, tone: "primary", delayMs: 0 },
  { index: 1, x: 36, y: 8, tone: "primary", delayMs: 80 },
  { index: 2, x: 64, y: 8, tone: "secondary", delayMs: 240 },
  { index: 3, x: 8, y: 36, tone: "primary", delayMs: 160 },
  { index: 4, x: 36, y: 36, tone: "secondary", delayMs: 320 },
  { index: 5, x: 64, y: 36, tone: "primary", delayMs: 480 },
  { index: 6, x: 8, y: 64, tone: "secondary", delayMs: 400 },
  { index: 7, x: 36, y: 64, tone: "primary", delayMs: 560 },
  { index: 8, x: 64, y: 64, tone: "primary", delayMs: 640 },
] as const satisfies Square[];

export interface CanvasAnimatedIconProps {
  /**
   * - --canvas-icon-primary: light square color
   * - --canvas-icon-secondary: dark square color
   */
  style?: CanvasAnimatedIconStyle;
}

export default function CanvasAnimatedIcon({ style }: CanvasAnimatedIconProps) {
  return (
    <StyledWrapper style={style}>
      <StyledSvg aria-label="Loading" role="progress" viewBox="0 0 96 96">
        {SQUARES.map(({ index, x, y, tone, delayMs }) => (
          <StyledSquare
            key={index}
            x={x}
            y={y}
            width="24"
            height="24"
            rx="4"
            $tone={tone}
            $delayMs={delayMs}
          />
        ))}
      </StyledSvg>
    </StyledWrapper>
  );
}
