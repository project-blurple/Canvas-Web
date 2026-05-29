import z from "zod";
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

export const CanvasExportScaleSchema = z.preprocess(
  (v) => Number(v),
  z.union([z.literal(1), z.literal(2), z.literal(4)]),
);

export const CanvasExportParamModel = z.object({
  canvasId: CanvasIdParamModel.shape.canvasId,
  scale: CanvasExportScaleSchema,
});

export const CanvasTimelapseParamModel = z.object({
  raw: z.coerce.boolean().optional(),
});
