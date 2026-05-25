import type { z } from "zod";
import type { NoticeBodyModel, NoticeIdParamModel } from "../models/index.js";
import type { NoticeSchema } from "../notice.js";

export type NoticeResBody = z.infer<typeof NoticeSchema>[];

export type Params = z.infer<typeof NoticeIdParamModel>;
export type ReqBody = z.input<typeof NoticeBodyModel>;
export type ReqQuery = Record<string, never>;
