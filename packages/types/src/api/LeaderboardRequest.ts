import type { z } from "zod";
import type { CanvasIdParamModel, LeaderboardQueryModel } from "../models";
import type { Paginated } from "../pagination";
import type { LeaderboardEntrySchema } from "../statistics";

export type Params = z.infer<typeof CanvasIdParamModel>;
export type ResBody = Paginated<typeof LeaderboardEntrySchema>;

export type ReqBody = Record<string, never>;
export type ReqQuery = z.infer<typeof LeaderboardQueryModel>;
