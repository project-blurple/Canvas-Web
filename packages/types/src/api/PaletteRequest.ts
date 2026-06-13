import type { z } from "zod";
import type { EventIdParamModel, PaletteQueryModel } from "../models/index.js";
import type { PaletteSchema } from "../palette.js";

export type Params = z.infer<typeof EventIdParamModel>;
export type ResBody = z.infer<typeof PaletteSchema>;

export type ReqBody = Record<string, never>;
export type ReqQuery = z.input<typeof PaletteQueryModel>;
