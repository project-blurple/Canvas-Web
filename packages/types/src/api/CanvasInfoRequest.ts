import type { z } from "zod";
import type { CanvasInfoSchema } from "../canvasInfo";
import type { CanvasIdParamModel } from "../models";

export type Params = z.infer<typeof CanvasIdParamModel>;
export type ResBody = z.infer<typeof CanvasInfoSchema>;
export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
