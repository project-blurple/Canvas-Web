import type { CanvasInfo } from "@blurple-canvas-web/types";
import z from "zod";
import BadRequestError from "@/errors/BadRequestError";

const CanvasIdParamModel = z.object({
  canvasId: z.coerce.number().int().positive(),
});

export const EventIdParamModel = z.object({
  eventId: z.coerce.number().int().positive(),
});

export type LeaderboardParamModel = typeof CanvasIdParamModel;

export const LeaderboardQueryModel = z.object({
  page: z.coerce.number().int().positive().optional(),
  size: z.coerce.number().int().positive().optional(),
});

export const PixelHistoryParamModel = z.object({
  x: z.coerce.number().int().nonnegative(),
  y: z.coerce.number().int().nonnegative(),
});

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

const FrameIdParamModel = z.object({
  frameId: z.string().regex(/^[0-9a-fA-F]{6}$/),
});

export const FrameDataParamModel = z
  .object({
    name: z.string().min(1).max(100),
    x0: z.coerce.number().int().nonnegative(),
    y0: z.coerce.number().int().nonnegative(),
    x1: z.coerce.number().int().positive(),
    y1: z.coerce.number().int().positive(),
  })
  .superRefine(({ x0, y0, x1, y1 }, ctx) => {
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
  });
export const FrameOwnerParamModel = z.object({
  ownerId: z.string().regex(/^\d+$/, "ownerId must be a numeric string"),
  isGuildOwned: z.boolean(),
});

export interface CanvasIdParam {
  canvasId: string;
  [key: string]: string;
}

export async function parseCanvasId(
  params: CanvasIdParam,
): Promise<CanvasInfo["id"]> {
  const result = await CanvasIdParamModel.safeParseAsync(params);
  if (!result.success) {
    throw new BadRequestError(
      `${params.canvasId} is not a valid canvas ID`,
      result.error.issues,
    );
  }

  return result.data.canvasId;
}

interface FrameIdParam {
  frameId: string;
  [key: string]: string;
}

export async function parseFrameId(params: FrameIdParam): Promise<string> {
  const result = await FrameIdParamModel.safeParseAsync(params);
  if (!result.success) {
    throw new BadRequestError(
      `${params.frameId} is not a valid frame ID`,
      result.error.issues,
    );
  }

  return result.data.frameId;
}
