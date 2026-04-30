import type { CanvasInfo } from "@blurple-canvas-web/types";
import z from "zod";
import { assertZodSuccess } from "../utils/models";

export const CanvasIdParamModel = z.object({
  canvasId: z.coerce.number().int().positive(),
});

export interface CanvasIdParam {
  canvasId: string;
  [key: string]: string;
}

export async function parseCanvasId(
  params: CanvasIdParam,
): Promise<CanvasInfo["id"]> {
  const result = await CanvasIdParamModel.safeParseAsync(params);
  assertZodSuccess(result, `${params.canvasId} is not a valid canvas ID`);

  return result.data.canvasId;
}

export const CreateCanvasBodyModel = z.object({
  name: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  startCoordinates: z
    .tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
    .optional(),
  cooldownLength: z.number().int().nonnegative().optional(),
});

export const EditCanvasBodyModel = z.object({
  name: z.string().min(1).optional(),
  cooldownLength: z.number().int().nonnegative().optional(),
  isLocked: z.boolean().optional(),
});
