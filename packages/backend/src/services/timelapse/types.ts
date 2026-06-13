/**
 * Timelapse service types, constants, and video format utilities.
 * Consolidated from original constants, types, and timelapseUtils.
 */

import type {
  CanvasExportScale,
  CanvasInfo,
  PaletteColor,
} from "@blurple-canvas-web/types";
import type { Bounds } from "@/utils";

// Re-export commonly used types from @blurple-canvas-web/types
export type { Bounds, CanvasExportScale, CanvasInfo, PaletteColor };

// ===== Video Format Types & Utilities =====

export type TimelapseType = "default" | "raw";
export type VideoFormat = "webm" | "mp4";

export const VIDEO_FORMAT_MAP: Record<TimelapseType, VideoFormat> = {
  default: "mp4",
  raw: "webm",
} as const;

/**
 * Gets the video format for a given timelapse type.
 * @param type The timelapse type ("default" or "raw")
 * @returns The corresponding video format ("mp4" or "webm")
 */
export function getTimelapseVideoFormat(type: TimelapseType): VideoFormat {
  return VIDEO_FORMAT_MAP[type];
}

// ===== Constants =====

export const END_CARD_TRANSITION_DURATION_MS = 1_000;
export const END_CARD_DISPLAY_DURATION_MS = 5_000;
export const END_CARD_BACKGROUND_COLOR = {
  r: 88,
  g: 101,
  b: 242,
  alpha: 1,
} as const;

export const notQuiteBlackRgba: PaletteColor["rgba"] = [35, 39, 42, 255];

export const APP_TEMP_DIR_NAME = "com.blurplecanvas.canvas/timelapse";

// ===== Timelapse Generation Parameters =====

export interface GenerateTimelapseParams {
  canvasId: CanvasInfo["id"];
  start?: Date;
  end?: Date;
  bounds?: Bounds;
  frameRate?: number;
  endHoldDurationMs?: number | null;
  showEndCard?: boolean;
  scale?: CanvasExportScale;
  backgroundColor?: PaletteColor["rgba"];
  raw?: TimelapseType;
}

export interface TimelapseCacheParams {
  canvasId: CanvasInfo["id"];
  canvasWidth: number;
  canvasHeight: number;
  requestedStartAt?: Date | undefined;
  requestedEndAt?: Date | undefined;
  effectiveStartAt: Date;
  effectiveEndAt: Date;
  cropBounds: Bounds | undefined;
  frameRate: number;
  endHoldDurationMs: number | null;
  showEndCard: boolean;
  scale: CanvasExportScale;
  backgroundColor: PaletteColor["rgba"];
  raw: TimelapseType;
}
