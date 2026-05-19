import z from "zod";

export const NoticeIdParamModel = z.object({
  noticeId: z.coerce.number().int().positive(),
});

const NoticeBodyFieldsModel = z.object({
  type: z.string(),
  header: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  priority: z.number().int().nonnegative().optional(),
  startAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional(),
  persisted: z.boolean().optional(),
  canvasId: z.number().int().positive().nullable().optional(),
});

function validateNoticeWindow(
  values: { startAt?: Date | null; endAt?: Date | null },
  ctx: z.core.$RefinementCtx,
) {
  const { startAt, endAt } = values;

  if (startAt && endAt && startAt >= endAt) {
    ctx.addIssue({
      code: "custom",
      path: ["endAt"],
      message: "endAt must be after startAt",
    });
  }
}

export const CreateNoticeBodyModel =
  NoticeBodyFieldsModel.superRefine(validateNoticeWindow);

export type CreateNoticeBody = z.infer<typeof CreateNoticeBodyModel>;

export const ModifyNoticeBodyModel =
  NoticeBodyFieldsModel.partial().superRefine(validateNoticeWindow);
export type ModifyNoticeBody = z.infer<typeof ModifyNoticeBodyModel>;
