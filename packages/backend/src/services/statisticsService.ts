import {
  CanvasInfo,
  LeaderboardEntry,
  UserStats,
} from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { createDefaultAvatarUrl } from "./discordProfileService";

export async function getUserStats(
  userId: string,
  canvasId: number,
): Promise<UserStats | null> {
  const stats = await prisma.user_stats.findFirst({
    where: {
      user_id: BigInt(userId),
      canvas_id: canvasId,
    },
    select: {
      user_id: true,
      canvas_id: true,
      total_pixels: true,
      rank: true,
      most_recent_timestamp: true,
      most_frequent_color: {
        select: {
          id: true,
          name: true,
          code: true,
          rgba: true,
        },
      },
    },
  });

  if (!stats) {
    return null;
  }

  return {
    userId: userId.toString(),
    canvasId: canvasId,
    totalPixels: stats.total_pixels,
    rank: stats.rank,
    mostFrequentColor: stats.most_frequent_color,
    // placeFrequency: place_frequency,
    mostRecentTimestamp: stats.most_recent_timestamp?.toISOString(),
  };
}

/**
 * Retrieves the top n users on the leaderboard for a canvas, up to a maximum
 * of 40.
 */
export async function getLeaderboard(
  canvasId: CanvasInfo["id"],
  size = 10,
): Promise<LeaderboardEntry[]> {
  const leaderboard = await prisma.leaderboard.findMany({
    take: Math.min(size, 40), // Arbitrary maximum
    orderBy: {
      rank: "asc",
    },
    where: {
      canvas_id: canvasId,
    },
    select: {
      rank: true,
      user_id: true,
      discord_user_profile: {
        select: {
          username: true,
          profile_picture_url: true,
        },
      },
      total_pixels: true,
    },
  });

  return leaderboard.map((row) => ({
    rank: row.rank,
    userId: row.user_id.toString(),
    totalPixels: row.total_pixels,
    username: row.discord_user_profile?.username,
    profilePictureUrl:
      row.discord_user_profile?.profile_picture_url ??
      createDefaultAvatarUrl(row.user_id),
  }));
}
