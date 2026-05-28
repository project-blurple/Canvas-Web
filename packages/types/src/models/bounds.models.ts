import z from "zod";

export const FrameBoundsModel = z.object({
  x0: z.coerce.number().int().nonnegative(),
  y0: z.coerce.number().int().nonnegative(),
  x1: z.coerce.number().int().positive(),
  y1: z.coerce.number().int().positive(),
});

export const OptionalFrameBoundsModel = FrameBoundsModel.partial()
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
      frameBoundsRefiner(data as z.infer<typeof FrameBoundsModel>, ctx);
    }
  })
  .transform((data) =>
    data.x0 === undefined ?
      undefined
    : (data as z.infer<typeof FrameBoundsModel>),
  );

export type FrameBoundsInput = z.infer<typeof OptionalFrameBoundsModel>;

export const frameBoundsRefiner = (
  { x0, y0, x1, y1 }: z.infer<typeof FrameBoundsModel>,
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
