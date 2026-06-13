import type { z } from "zod";
import type { UserCanvasParamModel } from "../models/index.js";
import type { UserStatsSchema } from "../statistics.js";

export type Params = z.infer<typeof UserCanvasParamModel>;
export type ResBody = z.infer<typeof UserStatsSchema>;

export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
