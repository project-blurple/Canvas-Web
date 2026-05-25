import type { z } from "zod";
import type { CanvasInfoSchema } from "../canvasInfo.js";
import type { CanvasIdParamModel } from "../models/index.js";

export type Params = z.infer<typeof CanvasIdParamModel>;
export type ResBody = z.infer<typeof CanvasInfoSchema>;
export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
