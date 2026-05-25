import type { z } from "zod";
import type { CanvasIdParamModel, PixelHistoryParamModel } from "../models/index.js";
import type { PixelHistoryWrapperSchema } from "../pixelHistory.js";

export type Params = z.infer<typeof CanvasIdParamModel> &
  Partial<z.infer<typeof PixelHistoryParamModel>>;

export type ResBody = z.infer<typeof PixelHistoryWrapperSchema>;

export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
