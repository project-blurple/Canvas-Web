import type { CanvasInfo } from "../canvasInfo";
import type { Cooldown } from "../cooldown";
import type { PixelInfo } from "../pixelInfo";

export interface Params {
  canvasId: CanvasInfo["id"];
}

export type ResBody = Cooldown;
export type ReqBody = PixelInfo;
