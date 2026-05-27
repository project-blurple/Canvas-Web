import z from "zod";

export const DiscordGuildRecordSchema = z.object({
  guild_id: z.string(),
  name: z.string(),
});

export type DiscordGuildRecord = z.infer<typeof DiscordGuildRecordSchema>;
