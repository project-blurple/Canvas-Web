import type {
  CanvasInfo,
  PaletteColorSummary,
  PixelColor,
  PixelHistoryUserSummary,
  PixelHistoryWrapper,
  Point,
} from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";
import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import { BlocklistService } from "@/blocklist/blocklist.service";
import { PixelReconciliationService } from "@/canvas/pixel-reconciliation.service";
import type { DB } from "@/common/database/core/kysely/types";
import { PrismaService } from "@/common/database/core/prisma.service";
import { PixelService } from "@/pixel/pixel.service";

export interface GetPixelHistoryParams {
  canvasId: CanvasInfo["id"];
  points: Point | [Point, Point];
  page?: number;
  size?: number;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  userIdFilter?: {
    ids: bigint[];
    include: boolean;
  };
  colorFilter?: {
    colors: number[];
    include: boolean;
  };
}

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pixelService: PixelService,
    private readonly pixelReconciliationService: PixelReconciliationService,
    private readonly blocklistService: BlocklistService,
  ) {}

  /**
   * Gets the pixel history summary for the given canvas and coordinates.
   *
   * @param params - Canvas, coordinates, pagination and filter options
   * @param includeSummary - Whether to compute the per-user aggregate summary
   */
  async getPixelHistorySummary(
    {
      canvasId,
      points,
      page,
      size,
      dateRange,
      userIdFilter,
      colorFilter,
    }: GetPixelHistoryParams,
    includeSummary: boolean = false,
  ): Promise<PixelHistoryWrapper> {
    if (Array.isArray(points)) {
      await Promise.all([
        this.pixelService.validatePixel(canvasId, points[0], false),
        this.pixelService.validatePixel(canvasId, points[1], false),
      ]);
    } else {
      await this.pixelService.validatePixel(canvasId, points, false);
    }

    const normalizedPoints: [Point, Point] =
      Array.isArray(points) ? points : [points, points];

    const fetchParams: GetPixelHistoryParams = {
      canvasId,
      points: normalizedPoints,
      dateRange,
      userIdFilter,
      colorFilter,
    };

    const pixelHistoryAndCountPromise = this.getPixelHistoryRowsWithCount({
      fetchParams,
      page,
      size,
    });

    const overlayPromise =
      this.hasOverlayFilters(fetchParams) ?
        this.getPixelHistoryOverlayPixels(fetchParams)
      : Promise.resolve(null);

    const summaryPromise =
      includeSummary ?
        Promise.all([
          this.getPixelHistoryUserCounts(fetchParams),
          this.getPixelHistoryUserColorCounts(fetchParams),
        ] as const)
      : Promise.resolve(null);

    const [
      { entries, total, page: truePage, size: trueSize },
      summary,
      overlayPixels,
    ] = await Promise.all([
      pixelHistoryAndCountPromise,
      summaryPromise,
      overlayPromise,
    ]);

    const users = summary ? this.buildPixelHistoryUsers(...summary) : undefined;

    return {
      total,
      page: truePage,
      size: trueSize,
      entries: entries.map((entry) => ({
        id: entry.id.toString(),
        color: entry.color,
        timestamp: entry.timestamp.toISOString(),
        guildId: entry.guildId?.toString(),
        userId: entry.userId.toString(),
        userProfile:
          entry.discordUserProfile ?
            {
              id: entry.discordUserProfile.userId.toString(),
              username: entry.discordUserProfile.username,
              profilePictureUrl: entry.discordUserProfile.profilePictureUrl,
            }
          : null,
      })),
      users,
      overlayPixels: overlayPixels ?? undefined,
    };
  }

  /**
   * Soft-erases (`erasedAt = now`) every history row matching the query, then
   * rebuilds the affected pixels from the remaining live history. Optionally
   * blocklists the authors of the erased rows.
   */
  async deletePixelHistoryEntries(
    params: GetPixelHistoryParams,
    shouldBlockAuthors: boolean = false,
  ): Promise<void> {
    const [pointTL, pointBR]: [Point, Point] =
      Array.isArray(params.points) ?
        params.points
      : [params.points, params.points];

    if (pointTL.x === pointBR.x && pointTL.y === pointBR.y) {
      await this.pixelService.validatePixel(params.canvasId, pointTL, false);
    } else {
      await Promise.all([
        this.pixelService.validatePixel(params.canvasId, pointTL, false),
        this.pixelService.validatePixel(params.canvasId, pointBR, false),
      ]);
    }

    const erasedAt = new Date();

    const deletedEntries = await this.prisma.$kysely
      .updateTable("history")
      .set({ erasedAt })
      .where((eb) => eb.and(this.buildPixelHistoryWhere(eb, params)))
      .returning(["id", "userId", "x", "y", "timestamp"])
      .execute();

    if (deletedEntries.length === 0) return;

    const coordinatesUpdated = [
      ...new Map(
        deletedEntries.map((entry) => [
          `${entry.x}:${entry.y}`,
          { x: entry.x, y: entry.y },
        ]),
      ).values(),
    ];

    await this.pixelReconciliationService.restorePixelsAfterHistoryModification(
      params.canvasId,
      coordinatesUpdated,
    );

    // TODO: snapshots

    if (shouldBlockAuthors) {
      const authorIds = new Set(deletedEntries.map((entry) => entry.userId));
      await this.blocklistService.addUsersToBlocklist(authorIds);
    }
  }

  private hasOverlayFilters(fetchParams: GetPixelHistoryParams): boolean {
    return Boolean(
      fetchParams.dateRange?.from !== undefined ||
      fetchParams.dateRange?.to !== undefined ||
      (fetchParams.userIdFilter?.ids.length ?? 0) > 0 ||
      (fetchParams.colorFilter?.colors.length ?? 0) > 0,
    );
  }

  /**
   * Gets paginated pixel history rows with total count using a window function.
   * Uses a single SQL query instead of separate findMany() + count() calls.
   */
  private async getPixelHistoryRowsWithCount({
    fetchParams,
    page = 1,
    size = 20,
  }: {
    fetchParams: GetPixelHistoryParams;
    page?: number;
    size?: number;
  }) {
    const take = Math.min(Math.max(size, 1), 100); // Arbitrary maximum
    const offset = Math.max((page - 1) * take, 0);

    const results = await this.prisma.$kysely
      .selectFrom("history")
      .innerJoin("color", "color.id", "history.colorId")
      .leftJoin(
        "discordUserProfile",
        "discordUserProfile.userId",
        "history.userId",
      )
      .select([
        "history.id",
        "history.colorId",
        "history.timestamp",
        "history.guildId",
        "history.userId",
        "color.code as colorCode",
        "color.name as colorName",
        "color.rgba as colorRgba",
        "color.global as colorGlobal",
        "discordUserProfile.userId as profileUserId",
        "discordUserProfile.username",
        "discordUserProfile.profilePictureUrl",
      ])
      .select((eb) => eb.fn.countAll<bigint>().over().as("totalCount"))
      .where((eb) => eb.and(this.buildPixelHistoryWhere(eb, fetchParams)))
      .orderBy("history.timestamp", "desc")
      .limit(take)
      .offset(offset)
      .execute();

    const total = results.length > 0 ? Number(results[0].totalCount) : 0;

    const entries = results.map((row) => ({
      id: row.id,
      color: this.toPaletteColorSummary({
        id: row.colorId,
        code: row.colorCode,
        name: row.colorName,
        rgba: row.colorRgba,
        global: row.colorGlobal,
      }),
      timestamp: row.timestamp,
      guildId: row.guildId,
      userId: row.userId,
      discordUserProfile:
        (
          row.profileUserId !== null &&
          row.username !== null &&
          row.profilePictureUrl !== null
        ) ?
          {
            userId: row.profileUserId,
            username: row.username,
            profilePictureUrl: row.profilePictureUrl,
          }
        : null,
    }));

    return {
      total,
      page: Math.max(page, 1),
      size: take,
      entries,
    };
  }

  private async getPixelHistoryOverlayPixels(
    fetchParams: GetPixelHistoryParams,
  ) {
    const results = await this.prisma.$kysely
      .selectFrom("history")
      .select(["x", "y", "colorId"])
      .distinctOn(["x", "y"])
      .where((eb) => eb.and(this.buildPixelHistoryWhere(eb, fetchParams)))
      .orderBy("x", "asc")
      .orderBy("y", "asc")
      .orderBy("timestamp", "desc")
      .orderBy("id", "desc")
      .execute();

    return results.map((row) => ({
      x: row.x,
      y: row.y,
      colorId: row.colorId,
    }));
  }

  /**
   * Builds the Kysely WHERE expressions shared by every history query.
   * The caller is expected to combine them with `eb.and(...)`.
   */
  private buildPixelHistoryWhere(
    eb: ExpressionBuilder<DB, "history">,
    params: GetPixelHistoryParams,
  ): Expression<SqlBool>[] {
    const points =
      Array.isArray(params.points) ?
        params.points
      : [params.points, params.points];

    const conditions: Expression<SqlBool>[] = [
      eb("history.erasedAt", "is", null),
      eb("history.canvasId", "=", params.canvasId),
      eb.between("history.x", points[0].x, points[1].x),
      eb.between("history.y", points[0].y, points[1].y),
    ];

    if (params.dateRange?.from !== undefined) {
      conditions.push(eb("history.timestamp", ">=", params.dateRange.from));
    }
    if (params.dateRange?.to !== undefined) {
      conditions.push(eb("history.timestamp", "<=", params.dateRange.to));
    }

    if (params.userIdFilter && params.userIdFilter.ids.length > 0) {
      const operator = params.userIdFilter.include ? "in" : "not in";
      conditions.push(eb("history.userId", operator, params.userIdFilter.ids));
    }

    if (params.colorFilter && params.colorFilter.colors.length > 0) {
      const operator = params.colorFilter.include ? "in" : "not in";
      conditions.push(
        eb("history.colorId", operator, params.colorFilter.colors),
      );
    }

    return conditions;
  }

  /** Gets aggregated pixel history counts per user with profile information. */
  private async getPixelHistoryUserCounts(fetchParams: GetPixelHistoryParams) {
    const results = await this.prisma.$kysely
      .selectFrom("history")
      .leftJoin(
        "discordUserProfile",
        "discordUserProfile.userId",
        "history.userId",
      )
      .select((eb) => [
        "history.userId",
        eb.fn.countAll<bigint>().as("countAll"),
        eb.fn.max("history.timestamp").as("maxTimestamp"),
        eb.fn.min("history.timestamp").as("minTimestamp"),
        "discordUserProfile.userId as profileUserId",
        "discordUserProfile.username",
        "discordUserProfile.profilePictureUrl",
      ])
      .where((eb) => eb.and(this.buildPixelHistoryWhere(eb, fetchParams)))
      .groupBy([
        "history.userId",
        "discordUserProfile.userId",
        "discordUserProfile.username",
        "discordUserProfile.profilePictureUrl",
      ])
      .execute();

    return results.map((row) => ({
      userId: row.userId,
      count: Number(row.countAll),
      maxTimestamp: row.maxTimestamp,
      minTimestamp: row.minTimestamp,
      discordUserProfile:
        (
          row.profileUserId !== null &&
          row.username !== null &&
          row.profilePictureUrl !== null
        ) ?
          {
            userId: row.profileUserId,
            username: row.username,
            profilePictureUrl: row.profilePictureUrl,
          }
        : null,
    }));
  }

  /**
   * Gets aggregated pixel history counts per user and color with profile
   * information.
   */
  private async getPixelHistoryUserColorCounts(
    fetchParams: GetPixelHistoryParams,
  ) {
    const results = await this.prisma.$kysely
      .selectFrom("history")
      .leftJoin(
        "discordUserProfile",
        "discordUserProfile.userId",
        "history.userId",
      )
      .select((eb) => [
        "history.userId",
        "history.colorId",
        eb.fn.countAll<bigint>().as("countAll"),
        "discordUserProfile.userId as profileUserId",
        "discordUserProfile.username",
        "discordUserProfile.profilePictureUrl",
      ])
      .where((eb) => eb.and(this.buildPixelHistoryWhere(eb, fetchParams)))
      .groupBy([
        "history.userId",
        "history.colorId",
        "discordUserProfile.userId",
        "discordUserProfile.username",
        "discordUserProfile.profilePictureUrl",
      ])
      .execute();

    return results.map((row) => ({
      userId: row.userId,
      colorId: row.colorId,
      count: Number(row.countAll),
    }));
  }

  private buildPixelHistoryUsers(
    userCounts: Awaited<
      ReturnType<HistoryService["getPixelHistoryUserCounts"]>
    >,
    userColorCounts: Awaited<
      ReturnType<HistoryService["getPixelHistoryUserColorCounts"]>
    >,
  ) {
    const users: PixelHistoryWrapper["users"] = {};

    for (const userCount of userCounts) {
      users[userCount.userId.toString()] = {
        count: userCount.count,
        colors: {},
        firstPlaced: (userCount.minTimestamp ?? new Date(0)).toISOString(),
        lastPlaced: (userCount.maxTimestamp ?? new Date(0)).toISOString(),
        userProfile:
          userCount.discordUserProfile ?
            ({
              id: userCount.discordUserProfile.userId.toString(),
              username: userCount.discordUserProfile.username,
              profilePictureUrl: userCount.discordUserProfile.profilePictureUrl,
            } as PixelHistoryUserSummary["userProfile"])
          : null,
      };
    }

    for (const colorCount of userColorCounts) {
      const userSummary = users[colorCount.userId.toString()];
      if (!userSummary) continue;
      userSummary.colors[colorCount.colorId.toString()] = colorCount.count;
    }

    return users;
  }

  private toPaletteColorSummary(color: {
    id: number;
    code: string;
    name: string;
    rgba: number[];
    global: boolean;
  }): PaletteColorSummary {
    return {
      id: color.id,
      code: color.code,
      name: color.name,
      rgba: color.rgba as PixelColor,
      global: color.global,
    };
  }
}
