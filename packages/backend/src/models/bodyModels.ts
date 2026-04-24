import z from "zod";

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

export const CreateEventBodyModel = z.object({
  name: z.string().min(1),
  id: z.number().int().nonnegative(),
});

export const EditEventBodyModel = z.object({
  name: z.string().min(1).optional(),
});

export const CreateCanvasBodyModel = z.object({
  name: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  startCoordinates: z
    .tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
    .optional(),
  allColorsGlobal: z.boolean().optional(),
  cooldownLength: z.number().int().nonnegative().optional(),
});

export const EditCanvasBodyModel = z.object({
  name: z.string().min(1).optional(),
  allColorsGlobal: z.boolean().optional(),
  cooldownLength: z.number().int().nonnegative().optional(),
  isLocked: z.boolean().optional(),
});

export const ColorBodyModel = z.object({
  code: z.string().length(4),
  name: z.string().min(1),
  global: z.boolean(),
  rgba: z.tuple([
    z.number().int().nonnegative().max(255),
    z.number().int().nonnegative().max(255),
    z.number().int().nonnegative().max(255),
    z.number().int().nonnegative().max(255),
  ]),
});
