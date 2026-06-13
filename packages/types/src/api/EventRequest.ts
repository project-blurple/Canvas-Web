import type { z } from "zod";
import type { BlurpleEventSchema } from "../event.js";
import type { EventIdParamModel } from "../models/index.js";

export type Params = z.infer<typeof EventIdParamModel>;
export type ResBody = z.infer<typeof BlurpleEventSchema>;
export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
