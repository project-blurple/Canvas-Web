import z from "zod";
import { FrameOwnerType } from "../frame.js";
import {
  BoundsModel,
  boundsRefiner,
  normalizeBounds,
} from "./bounds.models.js";
import {
  CanvasExportScaleSchema,
  CanvasIdParamModel,
} from "./canvas.models.js";
import { ColorIdParamModel } from "./index.js";
import { DiscordSnowflakeSchema } from "./snowflake.js";

export const FrameIdParamModel = z.object({
  frameId: z.string().regex(/^[0-9a-fA-F]{6}$/),
});

export const FrameDataParamModel = z
  .object({
    name: z.string().min(1).max(100),
    ...BoundsModel.shape,
  })
  .superRefine(boundsRefiner)
  .transform(normalizeBounds);

export type FrameDataInput = z.infer<typeof FrameDataParamModel>;

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
    ...BoundsModel.shape,
    ...CanvasIdParamModel.shape,
    owner: FrameOwnerParamModel,
  })
  .superRefine(boundsRefiner)
  .transform(normalizeBounds);

export type CreateFrameBodyModel = z.infer<typeof CreateFrameBodyModel>;

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

export const FrameColorStatsParamModel = z.object({
  frameId: FrameIdParamModel.shape.frameId,
  colorId: ColorIdParamModel.shape.colorId,
});
