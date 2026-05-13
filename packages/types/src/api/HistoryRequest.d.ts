import type { PixelHistory } from "../pixelHistory";

export interface Params {
  canvasId: number;
  coordinates?: [number, number];
}

export type ResBody = PixelHistory;

export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
