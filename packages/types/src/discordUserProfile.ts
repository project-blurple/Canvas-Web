import z from "zod";

export const GuildDataSchema = z.object({
  name: z.string(),
  memberCount: z.number().int().nonnegative().nullable(),
  administrator: z.boolean(),
  manageGuild: z.boolean(),
});

export type GuildData = z.infer<typeof GuildDataSchema>;

export const DiscordUserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  profilePictureUrl: z.string(),
  guilds: z.record(z.string(), GuildDataSchema).optional(),
  isCanvasAdmin: z.boolean().nullable().optional(),
  isCanvasModerator: z.boolean().nullable().optional(),
});

export type DiscordUserProfile = z.infer<typeof DiscordUserProfileSchema>;
