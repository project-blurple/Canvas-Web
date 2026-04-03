import { CanvasInfo } from "..";

export interface Params {
  canvasId: CanvasInfo["id"];
}

export type ResBody = CanvasInfo;
export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
