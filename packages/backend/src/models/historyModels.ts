import z from "zod";

export const PixelHistoryParamModel = z.object({
  x: z.coerce.number().int().nonnegative(),
  y: z.coerce.number().int().nonnegative(),
});

export const PixelHistoryComplexParamModel = z
  .object({
    x0: z.coerce.number().int().nonnegative(),
    y0: z.coerce.number().int().nonnegative(),
    x1: z.coerce.number().int().nonnegative().optional(),
    y1: z.coerce.number().int().nonnegative().optional(),
  })
  .superRefine(({ x1, y1 }, ctx) => {
    if ((x1 !== undefined) !== (y1 !== undefined)) {
      ctx.addIssue({
        code: "custom",
        message: "x1 and y1 must be provided together",
      });
    }
  });

export const PixelHistoryComplexBodyModel = z
  .object({
    fromDateTime: z.coerce.date().optional(),
    toDateTime: z.coerce.date().optional(),
    includeUserIds: z
      .array(z.string().regex(/^\d+$/, "user IDs must be numeric strings"))
      .optional(),
    excludeUserIds: z
      .array(z.string().regex(/^\d+$/, "user IDs must be numeric strings"))
      .optional(),
  })
  .superRefine(
    ({ fromDateTime, toDateTime, includeUserIds, excludeUserIds }, ctx) => {
      if (fromDateTime && toDateTime && fromDateTime >= toDateTime) {
        ctx.addIssue({
          code: "custom",
          message: "startDateTime must be before endDateTime",
        });
      }

      if (includeUserIds && excludeUserIds) {
        ctx.addIssue({
          code: "custom",
          message: "Cannot have both includeUserIds and excludeUserIds",
        });
      }
    },
  );

export const PixelHistoryDeleteBodyModel = z.object({
  historyIds: z.array(z.coerce.number().int().nonnegative()),
  shouldBlockAuthors: z.boolean().optional(),
});
