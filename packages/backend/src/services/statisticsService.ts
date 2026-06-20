import type {
  BlurpleEvent,
  CanvasInfo,
  CanvasStatisticsSummary,
  EventStatisticsSummary,
  LeaderboardEntrySchema,
  Paginated,
  PaletteColorSummary,
  UserStats,
} from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { NotFoundError } from "../errors";
import { createDefaultAvatarUrl } from "./discordProfileService";
import { toPaletteColorSummary } from "./paletteService";

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
          global: true,
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
    mostFrequentColor: toPaletteColorSummary(stats.most_frequent_color),
    // placeFrequency: place_frequency,
    mostRecentTimestamp: stats.most_recent_timestamp?.toISOString(),
  };
}

/**
 * Retrieves the top `size` (max 40), from the rank `(page - 1) * size`
 * users on the leaderboard for a canvas.
 */
export async function getCanvasLeaderboard(
  canvasId: CanvasInfo["id"],
  page = 1,
  size = 10,
): Promise<Paginated<typeof LeaderboardEntrySchema>> {
  const take = Math.min(Math.max(size, 1), 40); // Arbitrary maximum
  const leaderboard = await prisma.leaderboard.findMany({
    skip: Math.max((page - 1) * take, 0),
    take,
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

  const total = await prisma.leaderboard.count({
    where: {
      canvas_id: canvasId,
    },
  });

  return {
    total,
    page: Math.max(page, 1),
    size: take,
    entries: leaderboard.map((row) => ({
      rank: row.rank,
      userId: row.user_id.toString(),
      totalPixels: row.total_pixels,
      username: row.discord_user_profile?.username,
      profilePictureUrl:
        row.discord_user_profile?.profile_picture_url ??
        createDefaultAvatarUrl(row.user_id),
    })),
  };
}

export async function getCanvasColorLeaderboard(
  canvasId: CanvasInfo["id"],
  colorId: PaletteColorSummary["id"],
  page = 1,
  size = 10,
): Promise<Paginated<typeof LeaderboardEntrySchema>> {
  const take = Math.min(Math.max(size, 1), 40); // Arbitrary maximum
  const leaderboard = await prisma.color_leaderboard.findMany({
    skip: Math.max((page - 1) * take, 0),
    take,
    orderBy: {
      rank: "asc",
    },
    where: {
      canvas_id: canvasId,
      color_id: colorId,
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

  const total = await prisma.color_leaderboard.count({
    where: {
      canvas_id: canvasId,
      color_id: colorId,
    },
  });

  return {
    total,
    page: Math.max(page, 1),
    size: take,
    entries: leaderboard.map((row) => ({
      rank: row.rank,
      userId: row.user_id.toString(),
      totalPixels: row.total_pixels,
      username: row.discord_user_profile?.username,
      profilePictureUrl:
        row.discord_user_profile?.profile_picture_url ??
        createDefaultAvatarUrl(row.user_id),
    })),
  };
}

export async function getCanvasStatisticsSummary(
  canvasId: CanvasInfo["id"],
): Promise<CanvasStatisticsSummary> {
  const stats = await prisma.canvas_stats.findUnique({
    where: { canvas_id: canvasId },
  });

  if (!stats) {
    throw new NotFoundError(
      `Canvas statistics not found for canvas ${canvasId}`,
    );
  }

  return {
    canvasId,
    totalUsersInvolved: stats.total_users ?? 0,
    totalPixelsPlaced: stats.total_pixels ?? 0,
    lastPlacedAt: stats.last_placed_at.toISOString() ?? null,
  };
}

export async function getEventStatisticsSummary(
  eventId: BlurpleEvent["id"],
): Promise<EventStatisticsSummary> {
  const stats = await prisma.event_stats.findUnique({
    where: { event_id: eventId },
  });

  if (!stats) {
    throw new NotFoundError(`Event statistics not found for event ${eventId}`);
  }

  return {
    eventId,
    totalUsersInvolved: stats.total_users ?? 0,
    totalPixelsPlaced: stats.total_pixels ?? 0,
  };
}
