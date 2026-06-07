import type {
  CanvasInfo,
  PixelHistoryUserSummary,
  PixelHistoryWrapper,
  Point,
} from "@blurple-canvas-web/types";
import type { Expression, ExpressionBuilder, SqlBool } from "kysely";
import { prisma } from "@/client";
import type { DB } from "@/client/kysely/types";
import { addUsersToBlocklist } from "./blocklistService";
import { toPaletteColorSummary } from "./paletteService";
import {
  restorePixelsAfterHistoryModification,
  validatePixel,
} from "./pixelService";
import { setSnapshotDirtyTimestamp } from "./snapshot/snapshotService";

interface GetPixelHistoryParams {
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

function hasOverlayFilters(fetchParams: GetPixelHistoryParams): boolean {
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
async function getPixelHistoryRowsWithCount({
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

  const results = await prisma.$kysely
    .selectFrom("history")
    .innerJoin("color", "color.id", "history.color_id")
    .leftJoin(
      "discord_user_profile",
      "discord_user_profile.user_id",
      "history.user_id",
    )
    .select([
      "history.id",
      "history.color_id",
      "history.timestamp",
      "history.guild_id",
      "history.user_id",
      "color.code as color_code",
      "color.name as color_name",
      "color.rgba as color_rgba",
      "color.emoji_name as color_emoji_name",
      "color.emoji_id as color_emoji_id",
      "color.global as color_global",
      "discord_user_profile.user_id as profile_user_id",
      "discord_user_profile.username",
      "discord_user_profile.profile_picture_url",
    ])
    .select((eb) => eb.fn.countAll<bigint>().over().as("total_count"))
    .where((eb) => eb.and(buildPixelHistoryWhere(eb, fetchParams)))
    .orderBy("history.timestamp", "desc")
    .limit(take)
    .offset(offset)
    .execute();

  const total = results.length > 0 ? Number(results[0].total_count) : 0;

  const entries = results.map((row) => ({
    id: row.id,
    color: {
      id: row.color_id,
      code: row.color_code,
      name: row.color_name,
      rgba: row.color_rgba,
      emoji_name: row.color_emoji_name,
      emoji_id: row.color_emoji_id,
      global: row.color_global,
    },
    timestamp: row.timestamp,
    guild_id: row.guild_id,
    user_id: row.user_id,
    discord_user_profile:
      (
        row.profile_user_id !== null &&
        row.username !== null &&
        row.profile_picture_url !== null
      ) ?
        {
          user_id: row.profile_user_id,
          username: row.username,
          profile_picture_url: row.profile_picture_url,
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

async function getPixelHistoryOverlayPixels(
  fetchParams: GetPixelHistoryParams,
) {
  const results = await prisma.$kysely
    .selectFrom("history")
    .select(["x", "y", "color_id"])
    .distinctOn(["x", "y"])
    .where((eb) => eb.and(buildPixelHistoryWhere(eb, fetchParams)))
    .orderBy("x", "asc")
    .orderBy("y", "asc")
    .orderBy("timestamp", "desc")
    .orderBy("id", "desc")
    .execute();

  return results.map((row) => ({
    x: row.x,
    y: row.y,
    colorId: row.color_id,
  }));
}

/**
 * Builds the Kysely WHERE expressions shared by every history query.
 * The caller is expected to combine them with `eb.and(...)`.
 */
function buildPixelHistoryWhere(
  eb: ExpressionBuilder<DB, "history">,
  params: GetPixelHistoryParams,
): Expression<SqlBool>[] {
  const points =
    Array.isArray(params.points) ?
      params.points
    : [params.points, params.points];

  const conditions: Expression<SqlBool>[] = [
    eb("history.erased_at", "is", null),
    eb("history.canvas_id", "=", params.canvasId),
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
    conditions.push(eb("history.user_id", operator, params.userIdFilter.ids));
  }

  if (params.colorFilter && params.colorFilter.colors.length > 0) {
    const operator = params.colorFilter.include ? "in" : "not in";
    conditions.push(
      eb("history.color_id", operator, params.colorFilter.colors),
    );
  }

  return conditions;
}

/**
 * Gets aggregated pixel history counts per user with profile information.
 */
async function getPixelHistoryUserCounts(fetchParams: GetPixelHistoryParams) {
  const results = await prisma.$kysely
    .selectFrom("history")
    .leftJoin(
      "discord_user_profile",
      "discord_user_profile.user_id",
      "history.user_id",
    )
    .select((eb) => [
      "history.user_id",
      eb.fn.countAll<bigint>().as("count_all"),
      eb.fn.max("history.timestamp").as("max_timestamp"),
      eb.fn.min("history.timestamp").as("min_timestamp"),
      "discord_user_profile.user_id as profile_user_id",
      "discord_user_profile.username",
      "discord_user_profile.profile_picture_url",
    ])
    .where((eb) => eb.and(buildPixelHistoryWhere(eb, fetchParams)))
    .groupBy([
      "history.user_id",
      "discord_user_profile.user_id",
      "discord_user_profile.username",
      "discord_user_profile.profile_picture_url",
    ])
    .execute();

  return results.map((row) => ({
    user_id: row.user_id,
    count: Number(row.count_all),
    max_timestamp: row.max_timestamp,
    min_timestamp: row.min_timestamp,
    discord_user_profile:
      (
        row.profile_user_id !== null &&
        row.username !== null &&
        row.profile_picture_url !== null
      ) ?
        {
          user_id: row.profile_user_id,
          username: row.username,
          profile_picture_url: row.profile_picture_url,
        }
      : null,
  }));
}

/**
 * Gets aggregated pixel history counts per user and color with profile information.
 */
async function getPixelHistoryUserColorCounts(
  fetchParams: GetPixelHistoryParams,
) {
  const results = await prisma.$kysely
    .selectFrom("history")
    .leftJoin(
      "discord_user_profile",
      "discord_user_profile.user_id",
      "history.user_id",
    )
    .select((eb) => [
      "history.user_id",
      "history.color_id",
      eb.fn.countAll<bigint>().as("count_all"),
      "discord_user_profile.user_id as profile_user_id",
      "discord_user_profile.username",
      "discord_user_profile.profile_picture_url",
    ])
    .where((eb) => eb.and(buildPixelHistoryWhere(eb, fetchParams)))
    .groupBy([
      "history.user_id",
      "history.color_id",
      "discord_user_profile.user_id",
      "discord_user_profile.username",
      "discord_user_profile.profile_picture_url",
    ])
    .execute();

  return results.map((row) => ({
    user_id: row.user_id,
    color_id: row.color_id,
    count: Number(row.count_all),
    discord_user_profile:
      (
        row.profile_user_id !== null &&
        row.username !== null &&
        row.profile_picture_url !== null
      ) ?
        {
          user_id: row.profile_user_id,
          username: row.username,
          profile_picture_url: row.profile_picture_url,
        }
      : null,
  }));
}

function buildPixelHistoryUsers(
  userCounts: Awaited<ReturnType<typeof getPixelHistoryUserCounts>>,
  userColorCounts: Awaited<ReturnType<typeof getPixelHistoryUserColorCounts>>,
) {
  const users: PixelHistoryWrapper["users"] = {};

  for (const userCount of userCounts) {
    users[userCount.user_id.toString()] = {
      count: userCount.count,
      colors: {},
      firstPlaced: (userCount.min_timestamp ?? new Date(0)).toISOString(),
      lastPlaced: (userCount.max_timestamp ?? new Date(0)).toISOString(),
      userProfile:
        userCount.discord_user_profile ?
          ({
            id: userCount.discord_user_profile.user_id.toString(),
            username: userCount.discord_user_profile.username,
            profilePictureUrl:
              userCount.discord_user_profile.profile_picture_url,
          } as PixelHistoryUserSummary["userProfile"])
        : null,
    };
  }

  for (const colorCount of userColorCounts) {
    const userSummary = users[colorCount.user_id.toString()];
    if (!userSummary) continue;
    userSummary.colors[colorCount.color_id.toString()] = colorCount.count;
  }

  return users;
}

/**
 * Gets the pixel history summary for the given canvas and coordinates
 *
 * @param canvasId - The ID of the canvas
 * @param points - The coordinates of the pixel
 * @param page - The page number for pagination
 * @param size - The page size for pagination
 * @param dateRange - The date range for filtering history
 * @param userIdFilter - The user ID filter
 * @param colorFilter - The color filter
 */
export async function getPixelHistorySummary(
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
      validatePixel(canvasId, points[0], false),
      validatePixel(canvasId, points[1], false),
    ]);
  } else {
    await validatePixel(canvasId, points, false);
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

  const pixelHistoryAndCountPromise = getPixelHistoryRowsWithCount({
    fetchParams,
    page,
    size,
  });

  const overlayPromise =
    hasOverlayFilters(fetchParams) ?
      getPixelHistoryOverlayPixels(fetchParams)
    : Promise.resolve(null);

  const summaryPromise =
    includeSummary ?
      Promise.all([
        getPixelHistoryUserCounts(fetchParams),
        getPixelHistoryUserColorCounts(fetchParams),
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

  const users = summary ? buildPixelHistoryUsers(...summary) : undefined;

  return {
    total,
    page: truePage,
    size: trueSize,
    entries: entries.map((entry) => ({
      id: entry.id.toString(),
      color: toPaletteColorSummary(entry.color),
      timestamp: entry.timestamp.toISOString(),
      guildId: entry.guild_id?.toString(),
      userId: entry.user_id.toString(),
      userProfile:
        entry.discord_user_profile ?
          {
            id: entry.discord_user_profile.user_id.toString(),
            username: entry.discord_user_profile.username,
            profilePictureUrl: entry.discord_user_profile.profile_picture_url,
          }
        : null,
    })),
    users,
    overlayPixels: overlayPixels ?? undefined,
  };
}

export async function deletePixelHistoryEntries(
  params: GetPixelHistoryParams,
  shouldBlockAuthors: boolean = false,
): Promise<void> {
  const [pointTL, pointBR]: [Point, Point] =
    Array.isArray(params.points) ?
      params.points
    : [params.points, params.points];

  if (pointTL.x === pointBR.x && pointTL.y === pointBR.y) {
    await validatePixel(params.canvasId, pointTL, false);
  } else {
    await Promise.all([
      validatePixel(params.canvasId, pointTL, false),
      validatePixel(params.canvasId, pointBR, false),
    ]);
  }

  const erasedAt = new Date();

  const deletedEntries = await prisma.$kysely
    .updateTable("history")
    .set({ erased_at: erasedAt })
    .where((eb) => eb.and(buildPixelHistoryWhere(eb, params)))
    .returning(["id", "user_id", "x", "y", "timestamp"])
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

  await restorePixelsAfterHistoryModification(
    params.canvasId,
    coordinatesUpdated,
  );

  const earliestEntryTimestamp = deletedEntries.reduce((earliest, entry) => {
    return entry.timestamp < earliest ? entry.timestamp : earliest;
  }, deletedEntries[0].timestamp);
  await setSnapshotDirtyTimestamp(params.canvasId, earliestEntryTimestamp);

  if (shouldBlockAuthors) {
    const authorIds = new Set(deletedEntries.map((entry) => entry.user_id));
    await addUsersToBlocklist(authorIds);
  }
}

export async function restorePixelHistoryEntries(
  userIds: Iterable<bigint>,
  canvasIds: Iterable<number>,
): Promise<void> {
  const userIdsArray = Array.isArray(userIds) ? userIds : Array.from(userIds);
  const canvasIdsArray =
    Array.isArray(canvasIds) ? canvasIds : Array.from(canvasIds);

  if (userIdsArray.length === 0 || canvasIdsArray.length === 0) {
    return;
  }

  const restoredEntries = await prisma.$transaction(async (tx) => {
    const rows = await tx.$kysely
      .updateTable("history")
      .set({ erased_at: null })
      .where("user_id", "in", userIdsArray)
      .where("canvas_id", "in", canvasIdsArray)
      .where("erased_at", "is not", null)
      .returning(["canvas_id", "x", "y", "timestamp"])
      .execute();

    return rows;
  });

  if (restoredEntries.length === 0) {
    return;
  }

  const coordinatesByCanvas = new Map<number, Point[]>();
  const earliestEntryTimestampsByCanvas = new Map<number, Date>();
  for (const entry of restoredEntries) {
    const coordinates = coordinatesByCanvas.get(entry.canvas_id) ?? [];
    coordinates.push({ x: entry.x, y: entry.y });
    coordinatesByCanvas.set(entry.canvas_id, coordinates);

    if (!earliestEntryTimestampsByCanvas.has(entry.canvas_id)) {
      earliestEntryTimestampsByCanvas.set(entry.canvas_id, entry.timestamp);
    } else {
      const existing = earliestEntryTimestampsByCanvas.get(entry.canvas_id)!;
      if (entry.timestamp < existing) {
        earliestEntryTimestampsByCanvas.set(entry.canvas_id, entry.timestamp);
      }
    }
  }

  await Promise.all(
    Array.from(
      coordinatesByCanvas.entries(),
      async ([canvasId, coordinates]) => {
        await restorePixelsAfterHistoryModification(canvasId, coordinates);

        await setSnapshotDirtyTimestamp(
          canvasId,
          earliestEntryTimestampsByCanvas.get(canvasId)!,
        );
      },
    ),
  );
}
