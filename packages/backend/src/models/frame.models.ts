import z from "zod";
import { DiscordSnowflakeSchema } from "@/utils/discordRouteUtils";
import { CanvasIdParamModel } from "./canvas.models";

export enum FrameOwnerType {
  User = "user",
  Guild = "guild",
}

export const FrameIdParamModel = z.object({
  frameId: z.string().regex(/^[0-9a-fA-F]{6}$/),
});

const FrameBoundsModel = z.object({
  x0: z.coerce.number().int().nonnegative(),
  y0: z.coerce.number().int().nonnegative(),
  x1: z.coerce.number().int().positive(),
  y1: z.coerce.number().int().positive(),
});

const frameBoundsRefiner = (
  { x0, y0, x1, y1 }: z.infer<typeof FrameBoundsModel>,
  ctx: z.core.$RefinementCtx,
) => {
  if (x0 === x1) {
    ctx.addIssue({
      code: "custom",
      path: ["x1"],
      message: "x0 must not be equal to x1",
    });
  }

  if (y0 === y1) {
    ctx.addIssue({
      code: "custom",
      path: ["y1"],
      message: "y0 must not be equal to y1",
    });
  }
};

export const FrameDataParamModel = z
  .object({
    name: z.string().min(1).max(100),
    ...FrameBoundsModel.shape,
  })
  .superRefine(frameBoundsRefiner);

export const FrameOwnerParamModel = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(FrameOwnerType.User),
    userId: DiscordSnowflakeSchema,
  }),
  z.object({
    type: z.literal(FrameOwnerType.Guild),
    guildId: DiscordSnowflakeSchema,
  }),
]);

export type FrameOwnerInput = z.infer<typeof FrameOwnerParamModel>;

export const CreateFrameBodyModel = z
  .object({
    name: z.string().min(1).max(100),
    ...FrameBoundsModel.shape,
    ...CanvasIdParamModel.shape,
    owner: FrameOwnerParamModel,
  })
  .superRefine(frameBoundsRefiner);

export const FrameGuildIdsQueryModel = z.object({
  guildIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) =>
      value === undefined ? []
      : Array.isArray(value) ? value
      : [value],
    ),
});
