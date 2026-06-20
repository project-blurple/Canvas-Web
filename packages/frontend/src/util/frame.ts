import type {
  CanvasInfo,
  Frame,
  SystemOwnedFrame,
} from "@blurple-canvas-web/types";
import { FrameOwnerType } from "@blurple-canvas-web/types";

const SYSTEM_FRAME_PREFIX = "system-";
const SYSTEM_OWNER_NAME = "Blurple Canvas";

export type SystemFrameType = "fullCanvas";

export function getSystemFrameId(frameType: SystemFrameType): string {
  return `${SYSTEM_FRAME_PREFIX}${frameType}`;
}

/**
 * System frame definitions and utilities.
 * System frames are client-side only constructs that don't exist in the database.
 */
export const SystemFrames: Record<
  SystemFrameType,
  (canvas: CanvasInfo) => SystemOwnedFrame
> = {
  /**
   * Full canvas system frame - represents the entire canvas bounds
   */
  fullCanvas: (canvas: CanvasInfo): SystemOwnedFrame => ({
    id: getSystemFrameId("fullCanvas"),
    canvasId: canvas.id,
    name: canvas.name,
    x0: 0,
    y0: 0,
    x1: canvas.width,
    y1: canvas.height,
    owner: {
      type: FrameOwnerType.System,
      name: SYSTEM_OWNER_NAME,
    },
  }),
} as const;

export function isSystemFrameId(frameId: string | undefined | null): boolean {
  if (!frameId) return false;
  return frameId.toLowerCase().startsWith(SYSTEM_FRAME_PREFIX);
}

export function isSystemFrame(frame: Frame | null | undefined): boolean {
  if (!frame) return false;
  return isSystemFrameId(frame.id);
}

/**
 * Reconstruct a system frame from its ID and canvas data.
 * Returns null if the frame ID is not a system frame.
 */
export function reconstructSystemFrame(
  frameId: string | null | undefined,
  canvas: CanvasInfo,
): SystemOwnedFrame | null {
  if (!frameId || !isSystemFrameId(frameId)) return null;

  // Match against known system frame types
  for (const [frameType, constructor] of Object.entries(SystemFrames)) {
    if (frameId === getSystemFrameId(frameType as SystemFrameType)) {
      return constructor(canvas);
    }
  }

  return null;
}
