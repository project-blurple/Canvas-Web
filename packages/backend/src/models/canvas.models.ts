import z from "zod";

export const CanvasIdParamModel = z.object({
  canvasId: z.coerce.number().int().positive(),
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
  cooldownLength: z.number().int().nonnegative().optional(),
  isLocked: z.boolean().optional(),
  allColorsGlobal: z.boolean().optional(),
});
