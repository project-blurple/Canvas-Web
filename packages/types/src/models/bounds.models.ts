import z from "zod";

export const BoundsModel = z.object({
  x0: z.coerce.number().int().nonnegative(),
  y0: z.coerce.number().int().nonnegative(),
  x1: z.coerce.number().int().positive(),
  y1: z.coerce.number().int().positive(),
});

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
    }
  })
  .transform((data) =>
    data.x0 === undefined ? undefined : (data as z.infer<typeof BoundsModel>),
  );

export type BoundsInput = z.infer<typeof OptionalBoundsModel>;

/**
 * Bounds are inclusive, so a region from `x0` to `x1` spans `x1 - x0 + 1`
 * pixels. Augments bounds with their pixel `width`/`height`.
 */
export const boundsWithDimensions = <T extends z.infer<typeof BoundsModel>>(
  bounds: T,
) => ({
  ...bounds,
  width: bounds.x1 - bounds.x0 + 1,
  height: bounds.y1 - bounds.y0 + 1,
});

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
