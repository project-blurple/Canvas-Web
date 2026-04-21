export interface GuildData {
  name: string;
  memberCount: number | null;
  administrator: boolean;
  manageGuild: boolean;
}

export interface DiscordUserProfile {
  id: string;
  username: string;
  profilePictureUrl: string;
  guilds?: Record<string, GuildData>;
  isCanvasAdmin?: boolean | null;
  isCanvasModerator?: boolean | null;
}
