import z from "zod";
import { FrameOwnerType } from "../frame";
import { FrameBoundsModel, frameBoundsRefiner } from "./bounds.models";
import { CanvasExportScaleSchema, CanvasIdParamModel } from "./canvas.models";
import { DiscordSnowflakeSchema } from "./snowflake";

export const FrameIdParamModel = z.object({
  frameId: z.string().regex(/^[0-9a-fA-F]{6}$/),
});

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

export const ExportFrameParamModel = z.object({
  frameId: FrameIdParamModel.shape.frameId,
  scale: CanvasExportScaleSchema,
});
