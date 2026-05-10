import type { CanvasInfo } from "../canvasInfo";
import type { DiscordUserProfile } from "../discordUserProfile";
import type { UserStats } from "../statistics";

export interface Params {
  userId: DiscordUserProfile["id"];
  canvasId: CanvasInfo["id"];
}

export type ResBody = UserStats;

export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
