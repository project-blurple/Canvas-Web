import { DiscordUserProfile, GuildData } from "@blurple-canvas-web/types";
declare global {
  namespace Express {
    interface User extends DiscordUserProfile {}
  }
}

declare module "express-session" {
  interface SessionData {
    discordAccessToken?: string;
    discordGuildFlags?: Record<string, GuildData>;
  }
}
