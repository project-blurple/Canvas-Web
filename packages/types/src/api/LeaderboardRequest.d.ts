import { CanvasSummary, LeaderboardEntry, Paginated } from "..";

export interface Params {
  canvasId: CanvasSummary["id"];
}

export type ResBody = Paginated<LeaderboardEntry>;

export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
