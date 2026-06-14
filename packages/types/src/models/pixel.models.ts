import z from "zod";
import { CanvasIdParamModel } from "./canvas.models";

export const LeaderboardQueryModel = z.object({
  page: z.coerce.number().int().positive().optional(),
  size: z.coerce.number().int().positive().optional(),
});

export const UserCanvasParamModel = z.object({
  userId: z.string().regex(/^\d+$/, "userId must be a numeric string"),
  ...CanvasIdParamModel.shape,
});

export const PlacePixelBodyModel = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  colorId: z.number().int().nonnegative(),
  turnstileToken: z.string().min(1).optional(),
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

export const PlacePixelResponseModel = z.object({
  cooldownEndTime: z.number().int().nullable(),
});

export type PlacePixelResponse = z.infer<typeof PlacePixelResponseModel>;

export const PlacePixelArrayBodyModel = z.array(PlacePixelArrayElement);

export type PlacePixelArray = z.infer<typeof PlacePixelArrayBodyModel>;
