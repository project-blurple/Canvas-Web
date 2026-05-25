import z from "zod";

export enum CanvasPlaceState {
  NoOne = "no_one",
  NoNewUsers = "no_new_users",
  Anyone = "anyone",
}

export const CanvasInfoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  startCoordinates: z.tuple([
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
  ]),
  placeState: z.enum(CanvasPlaceState),
  eventId: z.number().int().nullable(),
  webPlacingEnabled: z.boolean(),
  allColorsGlobal: z.boolean(),
  cooldownDuration: z.number().int().nonnegative().nullable(),
});

export type CanvasInfo = z.infer<typeof CanvasInfoSchema>;

export const CanvasSummarySchema = CanvasInfoSchema.pick({
  id: true,
  name: true,
  eventId: true,
  placeState: true,
  width: true,
  height: true,
});

export type CanvasSummary = z.infer<typeof CanvasSummarySchema>;
