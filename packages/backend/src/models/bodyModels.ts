import { PixelColor } from "@blurple-canvas-web/types";
import z from "zod";

export const PlacePixelBodyModel = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  colorId: z.number().int().nonnegative(),
});

const PlacePixelArrayElement = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  rgba: z.array(z.number().int().nonnegative().max(255)).length(4),
});

export const PlacePixelArrayBodyModel = z.array(PlacePixelArrayElement);

export type PlacePixelArray = (z.infer<typeof PlacePixelArrayElement> & {
  rgba: PixelColor;
})[];
