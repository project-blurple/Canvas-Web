import z from "zod";

export const PixelInfoSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  colorId: z.number().int().nonnegative(),
});

export type PixelInfo = z.infer<typeof PixelInfoSchema>;
