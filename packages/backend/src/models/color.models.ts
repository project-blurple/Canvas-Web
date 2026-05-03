import type { PaletteColor } from "@blurple-canvas-web/types";
import z from "zod";
import { assertZodSuccess } from "@/utils/models";

const ColorIdParamModel = z.object({
  colorId: z.coerce.number().int().positive(),
});

export interface ColorIdParam {
  colorId: string;
}

export async function parseColorId(
  params: ColorIdParam,
): Promise<PaletteColor["id"]> {
  const result = await ColorIdParamModel.safeParseAsync(params);
  assertZodSuccess(result, `${params.colorId} is not a valid color ID`);
  return result.data.colorId;
}

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
