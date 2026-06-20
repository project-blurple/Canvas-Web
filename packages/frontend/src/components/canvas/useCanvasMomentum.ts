"use client";

import type { Point } from "@blurple-canvas-web/types";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { addPoints, multiplyPoint, ORIGIN } from "./point";

/**
 * Fraction of the velocity that carries over to the next frame. Lower values
 * bring the canvas to rest more quickly.
 */
const PAN_DECAY = 0.75;
/**
 * Below this per-frame velocity (in screen pixels) the motion is imperceptible,
 * so the animation stops to avoid spinning indefinitely.
 */
const PAN_STOP_THRESHOLD = 0.1;

export const prefersReducedMotion = () =>
  globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface UseCanvasMomentumParams {
  setOffset: Dispatch<SetStateAction<Point>>;
  clampOffset: (offset: Point, zoom: number) => Point;
  zoomRef: RefObject<number>;
}

export interface CanvasMomentum {
  /**
   * Continue panning from an existing per-frame velocity (screen px/frame),
   * decaying it to a smooth stop. Used to carry on after a pointer drag ends.
   */
  fling: (velocity: Point) => void;
  /**
   * Smoothly move the offset by `delta` screen pixels, easing out like a fling.
   * Used to animate keyboard-driven panning instead of jumping instantly.
   */
  glideBy: (delta: Point) => void;
  /** Immediately cancel any in-progress animation. */
  stop: () => void;
}

/**
 * Drives inertial canvas panning with a single `requestAnimationFrame` loop,
 * shared by pointer-drag momentum and keyboard "glide" panning. The velocity
 * lives in a ref, so individual frames only re-render via the offset update.
 */
export function useCanvasMomentum({
  setOffset,
  clampOffset,
  zoomRef,
}: UseCanvasMomentumParams): CanvasMomentum {
  const velocityRef = useRef<Point>(ORIGIN);
  const frameRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    velocityRef.current = ORIGIN;
  }, []);

  const step = useCallback(() => {
    const velocity = velocityRef.current;
    if (
      Math.abs(velocity.x) < PAN_STOP_THRESHOLD &&
      Math.abs(velocity.y) < PAN_STOP_THRESHOLD
    ) {
      stop();
      return;
    }

    setOffset((prevOffset) =>
      clampOffset(addPoints(prevOffset, velocity), zoomRef.current),
    );
    velocityRef.current = multiplyPoint(velocity, PAN_DECAY);
    frameRef.current = requestAnimationFrame(step);
  }, [setOffset, clampOffset, zoomRef, stop]);

  const ensureRunning = useCallback(() => {
    frameRef.current ??= requestAnimationFrame(step);
  }, [step]);

  /** Apply `delta` in a single jump, without animating. */
  const snapBy = useCallback(
    (delta: Point) => {
      setOffset((prevOffset) =>
        clampOffset(addPoints(prevOffset, delta), zoomRef.current),
      );
    },
    [setOffset, clampOffset, zoomRef],
  );

  const fling = useCallback(
    (velocity: Point) => {
      if (prefersReducedMotion()) {
        // Jump straight to where the decaying animation would have landed:
        // the geometric series sums to velocity / (1 - PAN_DECAY).
        snapBy(multiplyPoint(velocity, 1 / (1 - PAN_DECAY)));
        return;
      }
      velocityRef.current = velocity;
      ensureRunning();
    },
    [ensureRunning, snapBy],
  );

  const glideBy = useCallback(
    (delta: Point) => {
      if (prefersReducedMotion()) {
        snapBy(delta);
        return;
      }
      // A geometric series with ratio PAN_DECAY sums to v0 / (1 - PAN_DECAY), so
      // launching at delta * (1 - PAN_DECAY) lands the offset on `delta`. Adding
      // to the current velocity lets rapid key presses build on an in-flight
      // glide rather than resetting it.
      const launchVelocity = multiplyPoint(delta, 1 - PAN_DECAY);
      velocityRef.current = addPoints(velocityRef.current, launchVelocity);
      ensureRunning();
    },
    [ensureRunning, snapBy],
  );

  // Cleanup only: cancel a pending frame if we unmount mid-animation.
  useEffect(() => stop, [stop]);

  return { fling, glideBy, stop };
}
