import type { CanvasInfo } from "./canvasInfo";
import type { PaletteColorSummary } from "./palette";

export interface UserStats {
  userId: string;
  canvasId: CanvasInfo["id"];
  totalPixels?: number;
  rank?: number;
  mostFrequentColor?: PaletteColorSummary;
  // placeFrequency?: string;  // Not currently supported by Prisma
  mostRecentTimestamp?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  totalPixels: number;
  username?: string;
  profilePictureUrl: string;
}
