import z from "zod";
import { EventIdParamModel } from "./event.models";
import { GuildIdParamModel } from "./guild.models";

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
