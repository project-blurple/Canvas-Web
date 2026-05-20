import z from "zod";

export const GuildIdParamModel = z.object({
  guildId: z.string().regex(/^\d+$/, "guildId must be a numeric string"),
});
