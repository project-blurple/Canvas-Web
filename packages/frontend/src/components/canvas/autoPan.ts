import type { Point } from "@blurple-canvas-web/types";

interface AxisInput {
  oldCoord: number;
  newCoord: number;
  oldOffset: number;
  containerSize: number;
  canvasSize: number;
  zoom: number;
  padding: number;
}

/**
 * Screen-space position of a canvas pixel along one axis. The canvas origin
 * sits at the container's center, shifted by `offset`, with each canvas pixel
 * occupying `zoom` screen pixels.
 */
function pixelScreenPos({
  coord,
  offset,
  containerSize,
  canvasSize,
  zoom,
}: {
  coord: number;
  offset: number;
  containerSize: number;
  canvasSize: number;
  zoom: number;
}): number {
  return containerSize / 2 + offset + (coord + 0.5 - canvasSize / 2) * zoom;
}

/**
 * Calculates the new viewport offset for one axis when the reticle moves from
 * `oldCoord` to `newCoord`, following these rules:
 *
 * 1. If the reticle was off-screen on this axis, fully recenter on it.
 * 2. If the reticle was inside the padded threshold and stays inside, do not pan.
 * 3. If the reticle was inside the threshold and leaves it, pan by the movement delta
 *    so the reticle stays visually still.
 * 4. If the reticle was already outside the threshold (but on-screen), pan the minimum
 *    amount needed to put it back inside the threshold.
 */
function resolveAxisOffset({
  oldCoord,
  newCoord,
  oldOffset,
  containerSize,
  canvasSize,
  zoom,
  padding,
}: AxisInput): number {
  const screenArgs = { offset: oldOffset, containerSize, canvasSize, zoom };
  const oldScreen = pixelScreenPos({ coord: oldCoord, ...screenArgs });
  const newScreen = pixelScreenPos({ coord: newCoord, ...screenArgs });

  if (oldScreen < 0 || oldScreen > containerSize) {
    return (canvasSize / 2 - newCoord - 0.5) * zoom;
  }

  const thresholdMin = padding;
  const thresholdMax = containerSize - padding;

  const oldInside = oldScreen >= thresholdMin && oldScreen <= thresholdMax;
  if (oldInside) {
    const newInside = newScreen >= thresholdMin && newScreen <= thresholdMax;
    if (newInside) return oldOffset;
    return oldOffset - (newCoord - oldCoord) * zoom;
  }

  if (newScreen < thresholdMin) return oldOffset + (thresholdMin - newScreen);
  if (newScreen > thresholdMax) return oldOffset + (thresholdMax - newScreen);
  return oldOffset;
}

interface AutoPanInput {
  oldCoords: Point;
  newCoords: Point;
  offset: Point;
  container: { width: number; height: number };
  canvas: { width: number; height: number };
  zoom: number;
  padding: number;
}

/**
 * Computes the next viewport offset to apply when the reticle moves to a new
 * coordinate, evaluated independently on each axis. See {@link resolveAxisOffset}
 * for the per-axis rules.
 */
export function getAutoPanOffset({
  oldCoords,
  newCoords,
  offset,
  container,
  canvas,
  zoom,
  padding,
}: AutoPanInput): Point {
  return {
    x: resolveAxisOffset({
      oldCoord: oldCoords.x,
      newCoord: newCoords.x,
      oldOffset: offset.x,
      containerSize: container.width,
      canvasSize: canvas.width,
      zoom,
      padding,
    }),
    y: resolveAxisOffset({
      oldCoord: oldCoords.y,
      newCoord: newCoords.y,
      oldOffset: offset.y,
      containerSize: container.height,
      canvasSize: canvas.height,
      zoom,
      padding,
    }),
  };
}
