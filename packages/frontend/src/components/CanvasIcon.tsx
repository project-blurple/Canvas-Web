"use client";

import { css, styled } from "@mui/material";
import type { LucideProps } from "lucide-react";
import type { CSSProperties } from "react";
import React from "react";

type Tone = "primary" | "secondary";

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

interface CanvasIconStyle extends CSSProperties {
  "--canvas-icon-primary"?: string;
  "--canvas-icon-secondary"?: string;
}

export interface CanvasIconProps extends Omit<LucideProps, "style"> {
  loading?: boolean;
  style?: CanvasIconStyle;
}

const StyledSvg = styled("svg", {
  shouldForwardProp: (prop) => prop !== "$loading",
})<{ $loading?: boolean }>`
  ${({ $loading }) =>
    $loading &&
    css`
      cursor: wait;
      display: inline-block;
    `}
`;

const StyledSquare = styled("rect", {
  shouldForwardProp: (prop) => prop !== "$loading" && prop !== "$tone",
})<{ $loading?: boolean; $tone: Tone }>`
  transform-box: fill-box;
  transform-origin: center center;
  fill: ${({ $loading, $tone }) =>
    $tone === "primary" ? "currentColor"
    : $loading ?
      "var(--canvas-icon-secondary, oklch(from currentColor l c h / 0.8))"
    : "var(--canvas-icon-secondary, oklch(from currentColor l c h / 0.5))"};

  ${({ $loading }) =>
    $loading &&
    css`
      animation: canvas-icon-ripple-cycle 3000ms infinite;
      animation-delay: calc(var(--index) * 80ms);

      @keyframes canvas-icon-ripple-cycle {
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
    `}
`;

const CanvasIcon = React.forwardRef<SVGSVGElement, CanvasIconProps>(
  (
    {
      size = 24,
      color = "currentColor",
      className,
      style,
      loading = false,
      ...rest
    },
    ref,
  ) => {
    const mergedStyle: CanvasIconStyle = {
      ...(style as CSSProperties),
      "--canvas-icon-primary": color,
    };

    return (
      <StyledSvg
        ref={ref}
        $loading={loading}
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role={loading ? "progressbar" : undefined}
        style={mergedStyle}
        {...rest}
      >
        <title>{loading ? "Loading" : "Canvas"}</title>
        {squares.map(({ x, y, tone }, index) => (
          <StyledSquare
            key={`${x}-${y}`}
            $loading={loading}
            $tone={tone}
            x={x}
            y={y}
            width={24}
            height={24}
            rx={4}
            style={
              loading ? ({ "--index": index } as CSSProperties) : undefined
            }
          />
        ))}
      </StyledSvg>
    );
  },
);

CanvasIcon.displayName = "CanvasIcon";

export default CanvasIcon;
