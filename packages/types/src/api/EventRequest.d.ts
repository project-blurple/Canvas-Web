import type { BlurpleEvent } from "../event";

export interface Params {
  canvasId: BlurpleEvent["id"];
}

export type ResBody = BlurpleEvent;
export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
