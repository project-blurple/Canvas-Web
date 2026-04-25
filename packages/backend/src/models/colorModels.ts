import { PaletteColor } from "@blurple-canvas-web/types";
import z from "zod";
import { BadRequestError } from "@/errors";

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
  if (!result.success) {
    throw new BadRequestError(
      `${params.colorId} is not a valid color ID`,
      result.error.issues,
    );
  }

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
