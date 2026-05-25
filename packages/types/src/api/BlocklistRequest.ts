import type { z } from "zod";
import type { BlocklistEntrySchema } from "../blocklist.js";
import type { BlocklistBodyModel } from "../models/index.js";

export type BlocklistResBody = z.infer<typeof BlocklistEntrySchema>[];
export type ReqBody = z.input<typeof BlocklistBodyModel>;
