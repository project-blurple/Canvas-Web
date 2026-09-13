import type {
  CanvasExportScale,
  CanvasInfo,
  PaletteColor,
} from "@blurple-canvas-web/types";

export type TimelapseType = "default" | "raw";
export type VideoFormat = "webm" | "mp4";

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

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
