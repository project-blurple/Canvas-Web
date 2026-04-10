import { DiscordUserProfile } from "./discordUserProfile";

export interface PixelHistoryRecord {
  id: string;
  color: PaletteColor;
  timestamp: Date;
  guildId?: string;
  userId: string;
  userProfile: DiscordUserProfile | null;
}

export interface PixelHistoryWrapper {
  pixelHistory: PixelHistoryRecord[];
  totalEntries: number;
}

export type PixelHistory = PixelHistoryWrapper;
