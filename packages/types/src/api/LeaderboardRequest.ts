import type { z } from "zod";
import type { CanvasIdParamModel, LeaderboardQueryModel } from "../models/index.js";
import type { Paginated } from "../pagination.js";
import type { LeaderboardEntrySchema } from "../statistics.js";

export type Params = z.infer<typeof CanvasIdParamModel>;
export type ResBody = Paginated<typeof LeaderboardEntrySchema>;

export type ReqBody = Record<string, never>;
export type ReqQuery = z.infer<typeof LeaderboardQueryModel>;
