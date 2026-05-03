import type { DiscordUserProfile } from "./discordUserProfile";
import type { PaletteColorSummary } from "./palette";

export interface PixelHistoryRecord {
  id: string;
  color: PaletteColorSummary;
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
