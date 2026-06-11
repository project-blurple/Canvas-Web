import type { z } from "zod";
import type { NoticeBodyModel, NoticeIdParamModel } from "../models";
import type { NoticeSchema } from "../notice";

export type NoticeResBody = z.infer<typeof NoticeSchema>[];

export type Params = z.infer<typeof NoticeIdParamModel>;
export type ReqBody = z.input<typeof NoticeBodyModel>;
export type ReqQuery = Record<string, never>;
