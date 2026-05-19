import type { PixelHistory } from "../pixelHistory";

export interface Params {
  canvasId: number;
}

export type ResBody = PixelHistory;

export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
