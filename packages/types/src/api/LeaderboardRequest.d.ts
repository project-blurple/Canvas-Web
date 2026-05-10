import type { CanvasSummary } from "../canvasInfo";
import type { Paginated } from "../pagination";
import type { LeaderboardEntry } from "../statistics";

export interface Params {
  canvasId: CanvasSummary["id"];
}

export type ResBody = Paginated<LeaderboardEntry>;

export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
