import type { z } from "zod";
import type { BlocklistEntrySchema } from "../blocklist.js";
import type {
  BlocklistBodyModel,
  BlocklistDeleteBodyModel,
} from "../models/index.js";

export type BlocklistResBody = z.infer<typeof BlocklistEntrySchema>[];
export type ReqBody = z.input<typeof BlocklistBodyModel>;
export type DeleteReqBody = z.input<typeof BlocklistDeleteBodyModel>;
