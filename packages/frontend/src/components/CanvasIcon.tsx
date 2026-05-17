"use client";

import type { LucideProps } from "lucide-react";
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

const CanvasIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color = "currentColor", className, style, ...rest }, ref) => {
    const mergedStyle = {
      ...(style as React.CSSProperties),
      "--canvas-icon-primary": color,
    } as React.CSSProperties;

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={mergedStyle}
        {...rest}
      >
        <title>Canvas</title>
        {squares.map(({ x, y, tone }, i) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={24}
            height={24}
            rx={4}
            fill={
              tone === "primary" ? "currentColor" : (
                "var(--canvas-icon-secondary, oklch(from currentColor l c h / 0.5))"
              )
            }
          />
        ))}
      </svg>
    );
  },
);

CanvasIcon.displayName = "CanvasIcon";

export default CanvasIcon;
