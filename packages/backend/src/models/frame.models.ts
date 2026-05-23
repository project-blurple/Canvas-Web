import { FrameOwnerType } from "@blurple-canvas-web/types";
import z from "zod";
import { DiscordSnowflakeSchema } from "@/utils/discordRouteUtils";
import { CanvasIdParamModel } from "./canvas.models";

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

export const FrameOwnerParamModel = z
  .object({
    type: z.enum(FrameOwnerType),
    id: DiscordSnowflakeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.type === FrameOwnerType.System) {
      ctx.addIssue({
        code: "custom",
        path: ["type"],
        message: "System-owned frames are not allowed",
      });
    }
  });

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

export const ExportFrameQueryModel = z.object({
  size: z.coerce
    .number()
    .int()
    .refine((size) => size === 1 || size === 2 || size === 4, {
      message: "size must be 1, 2, or 4",
    })
    .default(1),
});
