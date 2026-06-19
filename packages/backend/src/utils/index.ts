// Make BigInt JSON serializable. See: https://github.com/GoogleChromeLabs/jsbi/issues/30

import type { CanvasExportScale } from "@blurple-canvas-web/types";

// @ts-expect-error This causes an error when running the server because toJSON doesn't exist. (But that's okay because we're adding it here!)
BigInt.prototype.toJSON = function (): string {
  return this.toString();
};

export const PrismaErrorCode = {
  UniqueConstraintViolation: "P2002",
  RecordNotFound: "P2025",
} as const;

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BoundsWithDimensions extends Bounds {
  width: number;
  height: number;
}

export function withDimensions(bounds: Bounds): BoundsWithDimensions {
  return {
    ...bounds,
    width: bounds.x1 - bounds.x0 + 1,
    height: bounds.y1 - bounds.y0 + 1,
  };
}

export function normalizeBounds({ x0, y0, x1, y1 }: Bounds): Bounds {
  return {
    x0: Math.min(x0, x1),
    y0: Math.min(y0, y1),
    x1: Math.max(x0, x1),
    y1: Math.max(y0, y1),
  };
}

/**
 * Return the value clamped so that it is within the range [min, max].
 */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateScale(pixelCount: number): CanvasExportScale {
  if (pixelCount <= 90_000) return 4; // 300x300
  if (pixelCount <= 360_000) return 2; // 600x600
  return 1;
}
