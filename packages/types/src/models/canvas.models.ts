import z from "zod";
import type CanvasExportSize from "../canvasExport";
import { CANVAS_EXPORT_SIZES } from "../canvasExport";
import { DiscordSnowflakeSchema } from "./snowflake";

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
  cooldownDuration: z.number().int().nonnegative().optional(),
});

export const EditCanvasBodyModel = z.object({
  name: z.string().min(1).optional(),
  cooldownDuration: z.number().int().nonnegative().optional(),
  isLocked: z.boolean().optional(),
  allColorsGlobal: z.boolean().optional(),
});

export const CanvasPasteBodyModel = z.object({
  authorId: DiscordSnowflakeSchema,
  data: z.array(
    z.tuple([
      z.number().int().nonnegative(), // x
      z.number().int().nonnegative(), // y
      z.number().int().nonnegative(), // color ID
    ]),
  ),
});

export const CanvasExportParamModel = z.object({
  canvasId: CanvasIdParamModel.shape.canvasId,
  size: z.coerce
    .number()
    .int()
    .refine((size) => CANVAS_EXPORT_SIZES.includes(size as CanvasExportSize), {
      message: `size must be one of: ${CANVAS_EXPORT_SIZES.join(", ")}`,
    }),
});
