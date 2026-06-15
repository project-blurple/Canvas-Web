import z from "zod";
import { NoticeTypeSchema } from "../notice";

export const NoticeIdParamModel = z.object({
  noticeId: z.coerce.number().int().positive(),
});

export const NoticeBodyModel = z
  .object({
    type: NoticeTypeSchema,
    header: z.string().trim().nullable().optional(),
    content: z.string().trim().nullable().optional(),
    priority: z.number().int().nonnegative().optional(),
    startAt: z.coerce.date().nullable().optional(),
    endAt: z.coerce.date().nullable().optional(),
    persisted: z.boolean().optional(),
    canvasId: z.number().int().positive().nullable().optional(),
  })
  .superRefine(({ startAt, endAt }, ctx) => {
    if (endAt && !startAt) {
      ctx.addIssue({
        code: "custom",
        path: ["startAt"],
        message: "startAt must be set when endAt is set",
      });
    }
    if (startAt && endAt && startAt >= endAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "endAt must be after startAt",
      });
    }
  });

export type NoticeBody = z.infer<typeof NoticeBodyModel>;
