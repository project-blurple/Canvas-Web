import type { z } from "zod";
import type { CanvasIdParamModel, CanvasPasteBodyModel } from "../models";

export type Params = z.infer<typeof CanvasIdParamModel>;

export type ResBody = Record<string, never>;

export type ReqBody = z.infer<typeof CanvasPasteBodyModel>;
export type ReqQuery = Record<string, never>;
