import type { DiscordUserProfile, GuildData } from "@blurple-canvas-web/types";

declare global {
  namespace Express {
    interface User extends DiscordUserProfile {}
  }
}

declare module "express-session" {
  interface SessionData {
    discordAccessToken?: string;
    discordRefreshToken?: string;
    discordTokenExpiresAt?: number;
    discordTokenLifetimeMs?: number;
    discordGuildFlags?: Record<string, GuildData>;
  }
}
