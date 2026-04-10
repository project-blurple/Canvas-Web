import { Point } from "@blurple-canvas-web/types";

export const ORIGIN: Point = { x: 0, y: 0 };

/**
 * Subtracts the components of the second point from the first.
 */
export function diffPoints(p1: Point, p2: Point): Point {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
}

/**
 * Adds the components of the two points together.
 */
export function addPoints(p1: Point, p2: Point): Point {
  return { x: p1.x + p2.x, y: p1.y + p2.y };
}

/**
 * Divide the components of the point by the scale.
 */
export function dividePoint(p1: Point, scale: number): Point {
  return { x: p1.x / scale, y: p1.y / scale };
}

/**
 * Multiply the components of the point by the scale.
 */
export function multiplyPoint(p1: Point, scale: number): Point {
  return { x: p1.x * scale, y: p1.y * scale };
}

export function tupleToPoint([x, y]: [number, number]): Point {
  return { x, y };
}

export function distanceBetweenPoints(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * Relpaces the usage of PointerEvent.movementX and PointerEvent.movementY due to issues outlined in
 * https://github.com/w3c/pointerlock/issues/42#issuecomment-1886587107
 */
export function getMovementDelta(prevEvent: PointerEvent, event: PointerEvent) {
  return {
    x: event.clientX - prevEvent.clientX,
    y: event.clientY - prevEvent.clientY,
  };
}
