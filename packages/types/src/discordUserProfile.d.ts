export interface DiscordUserProfile {
  id: string;
  username: string;
  profilePictureUrl: string;
  guildIdsBase64?: string;
  isCanvasAdmin?: boolean | null;
  isCanvasModerator?: boolean | null;
}
