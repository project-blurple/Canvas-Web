import {
  BlurpleEvent,
  CanvasInfo,
  PaletteColor,
} from "@blurple-canvas-web/types";
import z from "zod";
import BadRequestError from "@/errors/BadRequestError";

const CanvasIdParamModel = z.object({
  canvasId: z.coerce.number().int().positive(),
});

const EventIdParamModel = z.object({
  eventId: z.coerce.number().int().positive(),
});

const ColorIdParamModel = z.object({
  colorId: z.coerce.number().int().positive(),
});

const GuildIdParamModel = z.object({
  guildId: z.string().regex(/^\d+$/, "guildId must be a numeric string"),
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

export const PaletteQueryModel = z.object({
  allColors: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
});

export interface CanvasIdParam {
  canvasId: string;
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

export interface EventIdParam {
  eventId: string;
}

export async function parseEventId(
  params: EventIdParam,
): Promise<BlurpleEvent["id"]> {
  const result = await EventIdParamModel.safeParseAsync(params);
  if (!result.success) {
    throw new BadRequestError(
      `${params.eventId} is not a valid event ID`,
      result.error.issues,
    );
  }

  return result.data.eventId;
}

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

export interface GuildIdParam {
  guildId: string;
}

export async function parseGuildId(params: GuildIdParam): Promise<bigint> {
  const result = await GuildIdParamModel.safeParseAsync(params);
  if (!result.success) {
    throw new BadRequestError(
      `${params.guildId} is not a valid guild ID`,
      result.error.issues,
    );
  }

  return BigInt(result.data.guildId);
}
