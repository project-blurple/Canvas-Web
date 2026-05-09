import z from "zod";
import type { CanvasIdParamModel } from "./canvas.models";

export type LeaderboardParamModel = typeof CanvasIdParamModel;

export const LeaderboardQueryModel = z.object({
  page: z.coerce.number().int().positive().optional(),
  size: z.coerce.number().int().positive().optional(),
});

export const PixelHistoryParamModel = z.object({
  x: z.coerce.number().int().nonnegative(),
  y: z.coerce.number().int().nonnegative(),
});

export const PlacePixelBodyModel = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  colorId: z.number().int().nonnegative(),
});

const PlacePixelArrayElement = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  rgba: z.tuple([
    z.number().int().nonnegative().max(255),
    z.number().int().nonnegative().max(255),
    z.number().int().nonnegative().max(255),
    z.number().int().nonnegative().max(255),
  ]),
});

export const PlacePixelArrayBodyModel = z.array(PlacePixelArrayElement);

export type PlacePixelArray = z.infer<typeof PlacePixelArrayBodyModel>;
