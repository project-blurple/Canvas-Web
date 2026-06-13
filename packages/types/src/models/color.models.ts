import z from "zod";
import { EventIdParamModel } from "./event.models.js";
import { GuildIdParamModel } from "./guild.models.js";

export const ColorIdParamModel = z.object({
  colorId: z.coerce.number().int().positive(),
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

export const AssignColorParamModel = z.object({
  ...ColorIdParamModel.shape,
  ...EventIdParamModel.shape,
  ...GuildIdParamModel.shape,
});

export const PaletteQueryModel = z.object({
  allColors: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
});
