import z from "zod";

export const BoundsModel = z.object({
  x0: z.coerce.number().int().nonnegative(),
  y0: z.coerce.number().int().nonnegative(),
  x1: z.coerce.number().int().positive(),
  y1: z.coerce.number().int().positive(),
});

export const boundsRefiner = (
  { x0, y0, x1, y1 }: z.infer<typeof BoundsModel>,
  ctx: z.core.$RefinementCtx,
) => {
  if (x0 === x1) {
    ctx.addIssue({
      code: "custom",
      path: ["x1"],
      message: "x0 must not be equal to x1",
    });
  }

  if (y0 === y1) {
    ctx.addIssue({
      code: "custom",
      path: ["y1"],
      message: "y0 must not be equal to y1",
    });
  }
};

export const OptionalBoundsModel = BoundsModel.partial()
  .superRefine((data, ctx) => {
    const vals = [data.x0, data.y0, data.x1, data.y1];
    const definedCount = vals.filter((v) => v !== undefined).length;
    if (definedCount > 0 && definedCount < 4) {
      ctx.addIssue({
        code: "custom",
        message:
          "All bounds fields (x0, y0, x1, y1) must be provided or all omitted",
      });
      return;
    }
    if (definedCount === 4) {
      boundsRefiner(data as z.infer<typeof BoundsModel>, ctx);
    }
  })
  .transform((data) =>
    data.x0 === undefined ? undefined : (data as z.infer<typeof BoundsModel>),
  );

export type BoundsInput = z.infer<typeof OptionalBoundsModel>;

/** Orders bounds so (x0, y0) is the top-left and (x1, y1) the bottom-right. */
export const normalizeBounds = <T extends z.infer<typeof BoundsModel>>(
  data: T,
): T => ({
  ...data,
  x0: Math.min(data.x0, data.x1),
  y0: Math.min(data.y0, data.y1),
  x1: Math.max(data.x0, data.x1),
  y1: Math.max(data.y0, data.y1),
});
