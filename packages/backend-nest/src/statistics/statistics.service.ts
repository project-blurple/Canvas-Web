import type {
  BlurpleEvent,
  CanvasInfo,
  CanvasStatisticsSummary,
  EventStatisticsSummary,
  LeaderboardEntry,
  LeaderboardEntrySchema,
  Paginated,
  UserStats,
} from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/common/database/prisma.service";
import { NotFoundError } from "@/common/errors/not-found.error";
import { DiscordProfileService } from "@/discord/discord-profile.service";
import { PaletteService } from "@/palette/palette.service";

const MAX_LEADERBOARD_SIZE = 40;

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discordProfileService: DiscordProfileService,
  ) {}

  async getUserStats(
    userId: string,
    canvasId: number,
  ): Promise<UserStats | null> {
    const stats = await this.prisma.userStats.findFirst({
      where: {
        userId: BigInt(userId),
        canvasId,
      },
      select: {
        userId: true,
        canvasId: true,
        totalPixels: true,
        rank: true,
        mostRecentTimestamp: true,
        mostFrequentColor: {
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
      userId,
      canvasId,
      totalPixels: stats.totalPixels,
      rank: stats.rank,
      mostFrequentColor: PaletteService.toPaletteColorSummary(
        stats.mostFrequentColor,
      ),
      mostRecentTimestamp: stats.mostRecentTimestamp?.toISOString(),
    };
  }

  /**
   * Retrieves the top `size` (max 40), from the rank `(page - 1) * size`
   * users on the leaderboard for a canvas.
   */
  async getLeaderboard(
    canvasId: CanvasInfo["id"],
    page = 1,
    size = 10,
  ): Promise<Paginated<typeof LeaderboardEntrySchema>> {
    const take = Math.min(Math.max(size, 1), MAX_LEADERBOARD_SIZE);
    const leaderboard = await this.prisma.leaderboard.findMany({
      skip: Math.max((page - 1) * take, 0),
      take,
      orderBy: {
        rank: "asc",
      },
      where: {
        canvasId,
      },
      select: {
        rank: true,
        userId: true,
        discordUserProfile: {
          select: {
            username: true,
            profilePictureUrl: true,
          },
        },
        totalPixels: true,
      },
    });

    const total = await this.prisma.leaderboard.count({
      where: {
        canvasId,
      },
    });

    const entries: LeaderboardEntry[] = leaderboard.map((row) => ({
      rank: row.rank,
      userId: row.userId.toString(),
      totalPixels: row.totalPixels,
      username: row.discordUserProfile?.username,
      profilePictureUrl:
        row.discordUserProfile?.profilePictureUrl ??
        this.discordProfileService.createDefaultAvatarUrl(row.userId),
    }));

    return {
      total,
      page: Math.max(page, 1),
      size: take,
      entries,
    };
  }

  async getCanvasStatisticsSummary(
    canvasId: CanvasInfo["id"],
  ): Promise<CanvasStatisticsSummary> {
    const stats = await this.prisma.canvasStats.findUnique({
      where: { canvasId },
    });

    if (!stats) {
      throw new NotFoundError(
        `Canvas statistics not found for canvas ${canvasId}`,
      );
    }

    return {
      canvasId,
      totalUsersInvolved: stats.totalUsers ?? 0,
      totalPixelsPlaced: stats.totalPixels ?? 0,
      lastPlacedAt: stats.lastPlacedAt.toISOString(),
    };
  }

  async getEventStatisticsSummary(
    eventId: BlurpleEvent["id"],
  ): Promise<EventStatisticsSummary> {
    const stats = await this.prisma.eventStats.findUnique({
      where: { eventId },
    });

    if (!stats) {
      throw new NotFoundError(
        `Event statistics not found for event ${eventId}`,
      );
    }

    return {
      eventId,
      totalUsersInvolved: stats.totalUsers ?? 0,
      totalPixelsPlaced: stats.totalPixels ?? 0,
    };
  }
}
