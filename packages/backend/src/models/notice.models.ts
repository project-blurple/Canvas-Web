import z from "zod";
import { BadRequestError } from "@/errors";

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
  if (!result.success) {
    throw new BadRequestError(
      `${params.noticeId} is not a valid notice ID`,
      result.error.issues,
    );
  }

  return result.data.noticeId;
}

export const CreateNoticeBodyModel = z.object({
  type: z.string(),
  header: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  priority: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  persistOnDismiss: z.boolean().optional(),
  canvasId: z.number().int().positive().nullable().optional(),
});

export type CreateNoticeBody = z.infer<typeof CreateNoticeBodyModel>;

export const UpdateNoticeBodyModel = CreateNoticeBodyModel.partial().extend({
  noticeId: z.coerce.number().int().positive(),
});

export type UpdateNoticeBody = z.infer<typeof UpdateNoticeBodyModel>;
