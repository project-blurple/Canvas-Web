import z from "zod";

export const CanvasInfoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  startCoordinates: z.tuple([
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
  ]),
  isLocked: z.boolean(),
  eventId: z.number().int().nullable(),
  webPlacingEnabled: z.boolean(),
  allColorsGlobal: z.boolean(),
  cooldownDuration: z.number().int().nonnegative().nullable(),
  timelineEnabled: z.boolean(),
});

export type CanvasInfo = z.infer<typeof CanvasInfoSchema>;

export const CanvasSummarySchema = CanvasInfoSchema.pick({
  id: true,
  name: true,
  eventId: true,
  isLocked: true,
  width: true,
  height: true,
});

export type CanvasSummary = z.infer<typeof CanvasSummarySchema>;
