import type { z } from "zod";
import type { BlocklistEntrySchema } from "../blocklist";
import type { BlocklistBodyModel } from "../models";

export type BlocklistResBody = z.infer<typeof BlocklistEntrySchema>[];
export type ReqBody = z.input<typeof BlocklistBodyModel>;
