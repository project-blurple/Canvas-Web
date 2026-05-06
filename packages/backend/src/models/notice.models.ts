import z from "zod";
import { BadRequestError } from "@/errors";
import { assertZodSuccess } from "@/utils/models";

const NoticeIdParamModel = z.object({
  noticeId: z.coerce.number().int().positive(),
});

export interface NoticeIdParam {
  noticeId: number;
}

export async function parseNoticeId(
  params: NoticeIdParam,
): Promise<NoticeIdParam["noticeId"]> {
  const result = await NoticeIdParamModel.safeParseAsync(params);
  assertZodSuccess(result, `${params.noticeId} is not a valid notice ID`);

  return result.data.noticeId;
}

export const ModifyNoticeBodyModel = z
  .object({
    type: z.string(),
    header: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    priority: z.number().int().nonnegative().optional(),
    startAt: z.coerce.date().nullable().optional(),
    endAt: z.coerce.date().nullable().optional(),
    persisted: z.boolean().optional(),
    canvasId: z.number().int().positive().nullable().optional(),
  })
  .superRefine(({ startAt, endAt }, ctx) => {
    if (startAt && endAt && startAt >= endAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "endAt must be after startAt",
      });
    }
  });

export type CreateNoticeBody = z.infer<typeof ModifyNoticeBodyModel>;
