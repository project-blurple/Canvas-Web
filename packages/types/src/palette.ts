import z from "zod";

/** `[r, g, b, a]` */
export const PixelColorSchema = z.tuple([
  z.number().int().nonnegative().max(255),
  z.number().int().nonnegative().max(255),
  z.number().int().nonnegative().max(255),
  z.number().int().nonnegative().max(255),
]);

/** `[r, g, b, a]` */
export type PixelColor = z.infer<typeof PixelColorSchema>;

export const PaletteColorSummarySchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  rgba: PixelColorSchema,
  global: z.boolean(),
});

export type PaletteColorSummary = z.infer<typeof PaletteColorSummarySchema>;

export const PaletteColorSchema = PaletteColorSummarySchema.extend({
  invite: z.string().nullable(),
  guildName: z.string().nullable(),
  guildId: z.string().nullable(),
});

export type PaletteColor = z.infer<typeof PaletteColorSchema>;

export const PaletteSchema = z.array(PaletteColorSchema);

export type Palette = z.infer<typeof PaletteSchema>;
