import type {
  BlurpleEvent,
  CanvasInfo,
  CanvasStatisticsSummary,
  EventStatisticsSummary,
  Frame,
  FrameStatisticsSummary,
  LeaderboardEntry,
  LeaderboardEntrySchema,
  Paginated,
  PaletteColorSummary,
  UserStats,
} from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";

import { Prisma } from "@/common/database/core/prisma.client";
import { PrismaService } from "@/common/database/core/prisma.service";
import { NotFoundError } from "@/common/errors/not-found.error";
import { DiscordProfileService } from "@/discord/discord-profile.service";
import { PaletteService } from "@/palette/palette.service";

const MAX_LEADERBOARD_SIZE = 40;

interface PaginatedParams {
  page?: number;
  size?: number;
}

/**
 * Shared shape selected for every leaderboard variant (canvas, frame, and their
 * per-color counterparts), so a single mapper can build the entries.
 */
interface LeaderboardRow {
  rank: number;
  userId: bigint;
  totalPixels: number;
  discordUserProfile: {
    username: string;
    profilePictureUrl: string;
  } | null;
}

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
  async getCanvasLeaderboard({
    canvasId,
    page = 1,
    size = 10,
  }: {
    canvasId: CanvasInfo["id"];
  } & PaginatedParams): Promise<Paginated<typeof LeaderboardEntrySchema>> {
    const take = Math.min(Math.max(size, 1), MAX_LEADERBOARD_SIZE);
    const where = { canvasId };

    const [leaderboard, total] = await Promise.all([
      this.prisma.leaderboard.findMany({
        skip: Math.max((page - 1) * take, 0),
        take,
        orderBy: { rank: "asc" },
        where,
        select: {
          rank: true,
          userId: true,
          discordUserProfile: {
            select: { username: true, profilePictureUrl: true },
          },
          totalPixels: true,
        },
      }),
      this.prisma.leaderboard.count({ where }),
    ]);

    return {
      total,
      page: Math.max(page, 1),
      size: take,
      entries: this.toLeaderboardEntries(leaderboard),
    };
  }

  /**
   * Like {@link getCanvasLeaderboard}, but ranked per color. When `colorId` is
   * omitted, every color's leaderboard is returned (ordered by color, then rank).
   */
  async getCanvasColorLeaderboard({
    canvasId,
    colorId,
    page = 1,
    size = 10,
  }: {
    canvasId: CanvasInfo["id"];
    colorId?: PaletteColorSummary["id"];
  } & PaginatedParams): Promise<Paginated<typeof LeaderboardEntrySchema>> {
    const take = Math.min(Math.max(size, 1), MAX_LEADERBOARD_SIZE);
    const where = { canvasId, colorId };

    const [leaderboard, total] = await Promise.all([
      this.prisma.colorLeaderboard.findMany({
        skip: Math.max((page - 1) * take, 0),
        take,
        orderBy: [{ colorId: "asc" }, { rank: "asc" }],
        where,
        select: {
          rank: true,
          userId: true,
          discordUserProfile: {
            select: { username: true, profilePictureUrl: true },
          },
          totalPixels: true,
        },
      }),
      this.prisma.colorLeaderboard.count({ where }),
    ]);

    return {
      total,
      page: Math.max(page, 1),
      size: take,
      entries: this.toLeaderboardEntries(leaderboard),
    };
  }

  async getFrameLeaderboard({
    frameId,
    page = 1,
    size = 10,
  }: {
    frameId: Frame["id"];
  } & PaginatedParams): Promise<Paginated<typeof LeaderboardEntrySchema>> {
    const take = Math.min(Math.max(size, 1), MAX_LEADERBOARD_SIZE);
    const where = {
      frameId: { equals: frameId, mode: Prisma.QueryMode.insensitive },
    };

    const [leaderboard, total] = await Promise.all([
      this.prisma.leaderboardFrame.findMany({
        skip: Math.max((page - 1) * take, 0),
        take,
        orderBy: { rank: "asc" },
        where,
        select: {
          rank: true,
          userId: true,
          discordUserProfile: {
            select: { username: true, profilePictureUrl: true },
          },
          totalPixels: true,
        },
      }),
      this.prisma.leaderboardFrame.count({ where }),
    ]);

    return {
      total,
      page: Math.max(page, 1),
      size: take,
      entries: this.toLeaderboardEntries(leaderboard),
    };
  }

  async getFrameColorLeaderboard({
    frameId,
    colorId,
    page = 1,
    size = 10,
  }: {
    frameId: Frame["id"];
    colorId?: PaletteColorSummary["id"];
  } & PaginatedParams): Promise<Paginated<typeof LeaderboardEntrySchema>> {
    const take = Math.min(Math.max(size, 1), MAX_LEADERBOARD_SIZE);
    const where = {
      frameId: { equals: frameId, mode: Prisma.QueryMode.insensitive },
      colorId,
    };

    const [leaderboard, total] = await Promise.all([
      this.prisma.colorLeaderboardFrame.findMany({
        skip: Math.max((page - 1) * take, 0),
        take,
        orderBy: [{ colorId: "asc" }, { rank: "asc" }],
        where,
        select: {
          rank: true,
          userId: true,
          discordUserProfile: {
            select: { username: true, profilePictureUrl: true },
          },
          totalPixels: true,
        },
      }),
      this.prisma.colorLeaderboardFrame.count({ where }),
    ]);

    return {
      total,
      page: Math.max(page, 1),
      size: take,
      entries: this.toLeaderboardEntries(leaderboard),
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

    const colorDistribution = await this.prisma.canvasColors.findMany({
      where: { canvasId },
      select: { colorId: true, count: true },
      orderBy: { count: "desc" },
    });

    return {
      canvasId,
      totalUsersInvolved: stats.totalUsers ?? 0,
      totalPixelsPlaced: stats.totalPixels ?? 0,
      lastPlacedAt: stats.lastPlacedAt.toISOString(),
      colorDistribution,
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

  async getFrameStatisticsSummary(
    frameId: Frame["id"],
  ): Promise<FrameStatisticsSummary> {
    const stats = await this.prisma.frameStats.findFirst({
      where: {
        frameId: { equals: frameId, mode: Prisma.QueryMode.insensitive },
      },
    });

    if (!stats) {
      throw new NotFoundError(
        `Frame statistics not found for frame ${frameId}`,
      );
    }

    const colorDistribution = await this.prisma.frameColors.findMany({
      where: { frameId: stats.frameId },
      select: { colorId: true, count: true },
      orderBy: { count: "desc" },
    });

    return {
      frameId: stats.frameId,
      totalUsersInvolved: stats.totalUsers ?? 0,
      totalPixelsPlaced: stats.totalPixels ?? 0,
      lastPlacedAt: stats.lastPlacedAt.toISOString(),
      colorDistribution,
    };
  }

  private toLeaderboardEntries(rows: LeaderboardRow[]): LeaderboardEntry[] {
    return rows.map((row) => ({
      rank: row.rank,
      userId: row.userId.toString(),
      totalPixels: row.totalPixels,
      username: row.discordUserProfile?.username,
      profilePictureUrl:
        row.discordUserProfile?.profilePictureUrl ??
        this.discordProfileService.createDefaultAvatarUrl(row.userId),
    }));
  }
}
