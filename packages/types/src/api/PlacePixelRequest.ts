import type { z } from "zod";
import type { CooldownSchema } from "../cooldown.js";
import type {
  CanvasIdParamModel,
  PlacePixelBodyModel,
} from "../models/index.js";

export type Params = z.infer<typeof CanvasIdParamModel>;

export type ResBody = z.infer<typeof CooldownSchema>;
export type ReqBody = z.infer<typeof PlacePixelBodyModel>;
