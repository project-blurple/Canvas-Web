import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

export const discordConfig = registerAs(ConfigNamespace.Discord, () => {
  const env = validateEnv(process.env);

  return {
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    /** Guild whose roles grant canvas admin/moderator. */
    managementGuildId: env.DISCORD_MANAGEMENT_GUILD_ID,
    adminRoleId: env.DISCORD_ADMIN_ROLE_ID,
    moderatorRoleId: env.DISCORD_MODERATOR_ROLE_ID,
    /** Community invite surfaced to the frontend. */
    serverInvite: env.DISCORD_SERVER_INVITE,
  };
});

export type DiscordConfig = ConfigType<typeof discordConfig>;
