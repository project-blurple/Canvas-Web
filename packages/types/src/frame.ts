import z from "zod";
import { DiscordGuildRecordSchema } from "./discordGuildRecord.js";
import { DiscordUserProfileSchema } from "./discordUserProfile.js";

/**
 * Enum-like map of valid frame owner types. Available both as runtime values
 * (e.g. `FrameOwnerType.User`) and as a type (the union of its string values).
 */
export enum FrameOwnerType {
  User = "user",
  Guild = "guild",
  System = "system",
}

const BaseFrameSchemaCore = z.object({
  id: z.string(),
  canvasId: z.number().int().positive(),
  name: z.string(),
  x0: z.number().int().nonnegative(),
  y0: z.number().int().nonnegative(),
  x1: z.number().int().positive(),
  y1: z.number().int().positive(),
});

type BaseFrameCore = z.infer<typeof BaseFrameSchemaCore>;

const addDimensions = <T extends z.ZodType<BaseFrameCore>>(schema: T) =>
  schema.transform((frame) => ({
    ...frame,
    width: frame.x1 - frame.x0 + 1,
    height: frame.y1 - frame.y0 + 1,
  }));

export const BaseFrameSchema = addDimensions(BaseFrameSchemaCore);

export type BaseFrame = z.infer<typeof BaseFrameSchema>;

export const UserOwnedFrameSchema = addDimensions(
  BaseFrameSchemaCore.extend({
    owner: z.object({
      type: z.literal(FrameOwnerType.User),
      user: DiscordUserProfileSchema,
    }),
  }),
);

export type UserOwnedFrame = z.infer<typeof UserOwnedFrameSchema>;

export const GuildOwnedFrameSchema = addDimensions(
  BaseFrameSchemaCore.extend({
    owner: z.object({
      type: z.literal(FrameOwnerType.Guild),
      guild: DiscordGuildRecordSchema,
    }),
  }),
);

export type GuildOwnedFrame = z.infer<typeof GuildOwnedFrameSchema>;

export const SystemOwnedFrameSchema = addDimensions(
  BaseFrameSchemaCore.extend({
    owner: z.object({
      type: z.literal(FrameOwnerType.System),
      name: z.literal("Blurple Canvas"),
    }),
  }),
);

export type SystemOwnedFrame = z.infer<typeof SystemOwnedFrameSchema>;

export const FrameSchema = z.union([
  UserOwnedFrameSchema,
  GuildOwnedFrameSchema,
  SystemOwnedFrameSchema,
]);

export type Frame = z.infer<typeof FrameSchema>;
