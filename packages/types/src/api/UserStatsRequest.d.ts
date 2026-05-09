import type { CanvasInfo, DiscordUserProfile, UserStats } from "..";

export interface Params {
  userId: DiscordUserProfile["id"];
  canvasId: CanvasInfo["id"];
}

export type ResBody = UserStats;

export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
