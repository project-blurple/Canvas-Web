import type { z } from "zod";
import type { CanvasSummarySchema } from "../canvasInfo.js";

export type Params = Record<string, never>;
export type ResBody = z.infer<typeof CanvasSummarySchema>[];
export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
