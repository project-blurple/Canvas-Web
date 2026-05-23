import type { z } from "zod";
import type { CooldownSchema } from "../cooldown";
import type { CanvasIdParamModel, PlacePixelBodyModel } from "../models";

export type Params = z.infer<typeof CanvasIdParamModel>;

export type ResBody = z.infer<typeof CooldownSchema>;
export type ReqBody = z.infer<typeof PlacePixelBodyModel>;
