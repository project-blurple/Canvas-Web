import type { DiscordUserProfile } from "./discordUserProfile";
import type { Paginated } from "./pagination";
import type { PaletteColorSummary } from "./palette";

export interface PixelHistoryRecord {
  id: string;
  color: PaletteColorSummary;
  timestamp: Date;
  guildId?: string;
  userId: string;
  userProfile: DiscordUserProfile | null;
}

export interface PixelHistoryUserSummary {
  count: number;
  colors: Record<string, number>;
  firstPlaced: Date;
  lastPlaced: Date;
  userProfile: DiscordUserProfile | null;
}

export type PixelHistoryWrapper = Paginated<PixelHistoryRecord> & {
  users?: Record<string, PixelHistoryUserSummary>;
  executionDurationMs?: number;
};

export type PixelHistory = PixelHistoryWrapper;
