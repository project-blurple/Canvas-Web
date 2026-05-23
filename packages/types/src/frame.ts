import z from "zod";
import { DiscordGuildRecordSchema } from "./discordGuildRecord";
import { DiscordUserProfileSchema } from "./discordUserProfile";

/**
 * Enum-like map of valid frame owner types. Available both as runtime values
 * (e.g. `FrameOwnerType.User`) and as a type (the union of its string values).
 */
export enum FrameOwnerType {
  User = "user",
  Guild = "guild",
  System = "system",
}

export const BaseFrameSchema = z.object({
  id: z.string(),
  canvasId: z.number().int().positive(),
  name: z.string(),
  x0: z.number().int().nonnegative(),
  y0: z.number().int().nonnegative(),
  x1: z.number().int().positive(),
  y1: z.number().int().positive(),
});

export type BaseFrame = z.infer<typeof BaseFrameSchema>;

export const UserOwnedFrameSchema = BaseFrameSchema.extend({
  owner: z.object({
    type: z.literal(FrameOwnerType.User),
    user: DiscordUserProfileSchema,
  }),
});

export type UserOwnedFrame = z.infer<typeof UserOwnedFrameSchema>;

export const GuildOwnedFrameSchema = BaseFrameSchema.extend({
  owner: z.object({
    type: z.literal(FrameOwnerType.Guild),
    guild: DiscordGuildRecordSchema,
  }),
});

export type GuildOwnedFrame = z.infer<typeof GuildOwnedFrameSchema>;

export const SystemOwnedFrameSchema = BaseFrameSchema.extend({
  owner: z.object({
    type: z.literal(FrameOwnerType.System),
    name: z.literal("Blurple Canvas"),
  }),
});

export type SystemOwnedFrame = z.infer<typeof SystemOwnedFrameSchema>;

export const FrameSchema = z.union([
  UserOwnedFrameSchema,
  GuildOwnedFrameSchema,
  SystemOwnedFrameSchema,
]);

export type Frame = z.infer<typeof FrameSchema>;
