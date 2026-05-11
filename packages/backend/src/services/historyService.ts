import type {
  CanvasInfo,
  PixelHistoryUserSummary,
  PixelHistoryWrapper,
  Point,
} from "@blurple-canvas-web/types";
import { Prisma, prisma } from "@/client";
import { addUsersToBlocklist } from "./blocklistService";
import { toPaletteColorSummary } from "./paletteService";
import {
  restorePixelsAfterHistoryDeletion,
  validatePixel,
} from "./pixelService";

interface GetPixelHistoryParams {
  canvasId: CanvasInfo["id"];
  points: Point | [Point, Point];
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

const pixelHistorySelect = {
  id: true,
  color: true,
  timestamp: true,
  guild_id: true,
  user_id: true,
  discord_user_profile: true,
} as const satisfies Prisma.historySelect;

type PixelHistoryRow = Prisma.historyGetPayload<{
  select: typeof pixelHistorySelect;
}>;

interface PixelHistoryUserCountRow {
  user_id: bigint;
  discord_user_profile: {
    user_id: bigint;
    username: string;
    profile_picture_url: string | null;
  } | null;
  _count: {
    _all: number;
  };
  _max: {
    timestamp: Date | null;
  };
  _min: {
    timestamp: Date | null;
  };
}

interface PixelHistoryUserColorCountRow {
  user_id: bigint;
  color_id: number;
  discord_user_profile: {
    user_id: bigint;
    username: string;
    profile_picture_url: string | null;
  } | null;
  _count: {
    _all: number;
  };
}

interface PixelHistoryUserCountRawResult {
  user_id: bigint;
  count_all: bigint;
  max_timestamp: Date | null;
  min_timestamp: Date | null;
  profile_user_id: bigint | null;
  username: string | null;
  profile_picture_url: string | null;
}

interface PixelHistoryUserColorCountRawResult {
  user_id: bigint;
  color_id: number;
  count_all: bigint;
  profile_user_id: bigint | null;
  username: string | null;
  profile_picture_url: string | null;
}

interface PixelHistoryRowRawResultWithCount {
  id: bigint;
  color_id: number;
  timestamp: Date;
  guild_id: bigint | null;
  user_id: bigint;
  color_code: string;
  color_name: string;
  color_rgba: number[];
  color_emoji_name: string | null;
  color_emoji_id: bigint | null;
  color_global: boolean;
  profile_user_id: bigint | null;
  username: string | null;
  profile_picture_url: string;
  total_count: bigint;
}

function mapPixelHistoryRow(history: PixelHistoryRow) {
  return {
    id: history.id.toString(),
    color: toPaletteColorSummary(history.color),
    timestamp: history.timestamp,
    guildId: history.guild_id?.toString(),
    userId: history.user_id.toString(),
    userProfile:
      history.discord_user_profile ?
        {
          id: history.discord_user_profile.user_id.toString(),
          username: history.discord_user_profile.username,
          profilePictureUrl: history.discord_user_profile.profile_picture_url,
        }
      : null,
  };
}

/**
 * Gets paginated pixel history rows with total count using a window function.
 * Uses a single SQL query instead of separate findMany() + count() calls.
 */
async function getPixelHistoryRowsWithCount({
  fetchParams,
  limit,
}: {
  fetchParams: GetPixelHistoryParams;
  limit?: number;
}): Promise<{ rows: PixelHistoryRow[]; totalCount: number }> {
  const whereFragments = buildPixelHistoryWhereSQL(fetchParams);

  // Combine fragments with AND
  let whereSQL: Prisma.Sql;
  if (whereFragments.length === 0) {
    whereSQL = Prisma.sql`TRUE`;
  } else {
    whereSQL =
      whereFragments.length === 1 ?
        whereFragments[0]
      : Prisma.sql`${Prisma.join(whereFragments, " AND ")}`;
  }

  const results = await prisma.$queryRaw<PixelHistoryRowRawResultWithCount[]>`
    SELECT
      h.id,
      h.color_id,
      h.timestamp,
      h.guild_id,
      h.user_id,
      c.code as color_code,
      c.name as color_name,
      c.rgba as color_rgba,
      c.emoji_name as color_emoji_name,
      c.emoji_id as color_emoji_id,
      c.global as color_global,
      p.user_id as profile_user_id,
      p.username,
      p.profile_picture_url,
      COUNT(*) OVER() as total_count
    FROM history h
    INNER JOIN color c ON c.id = h.color_id
    LEFT JOIN discord_user_profile p ON p.user_id = h.user_id
    WHERE ${whereSQL}
    ORDER BY h.timestamp DESC
    LIMIT ${limit ?? 100}
  `;

  let totalCount = 0;
  if (results.length > 0) {
    const [first] = results;
    totalCount = Number(first.total_count);
  }

  // Map raw results to PixelHistoryRow shape with profile object
  const rows: PixelHistoryRow[] = results.map((row) => ({
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
      row.profile_user_id !== null && row.username !== null ?
        {
          user_id: row.profile_user_id,
          username: row.username,
          profile_picture_url: row.profile_picture_url,
        }
      : null,
  }));

  return { rows, totalCount };
}

/**
 * Builds parameterized SQL WHERE clause fragments from filter parameters.
 * Uses Prisma.sql for safe parameter binding.
 */
function buildPixelHistoryWhereSQL(
  params: GetPixelHistoryParams,
): Prisma.Sql[] {
  const points =
    Array.isArray(params.points) ?
      params.points
    : [params.points, params.points];

  const fragments: Prisma.Sql[] = [
    Prisma.sql`h.erased_at IS NULL`,
    Prisma.sql`h.canvas_id = ${params.canvasId}`,
    Prisma.sql`h.x >= ${points[0].x} AND h.x <= ${points[1].x}`,
    Prisma.sql`h.y >= ${points[0].y} AND h.y <= ${points[1].y}`,
  ];

  // Timestamp filter
  if (
    params.dateRange?.from !== undefined &&
    params.dateRange?.to !== undefined
  ) {
    fragments.push(
      Prisma.sql`h.timestamp >= ${params.dateRange.from} AND h.timestamp <= ${params.dateRange.to}`,
    );
  } else if (params.dateRange?.from !== undefined) {
    fragments.push(Prisma.sql`h.timestamp >= ${params.dateRange.from}`);
  } else if (params.dateRange?.to !== undefined) {
    fragments.push(Prisma.sql`h.timestamp <= ${params.dateRange.to}`);
  }

  // User ID filter
  if (params.userIdFilter && params.userIdFilter.ids.length > 0) {
    if (params.userIdFilter.include) {
      fragments.push(Prisma.sql`h.user_id = ANY(${params.userIdFilter.ids})`);
    } else {
      fragments.push(
        Prisma.sql`NOT (h.user_id = ANY(${params.userIdFilter.ids}))`,
      );
    }
  }

  // Color ID filter
  if (params.colorFilter && params.colorFilter.colors.length > 0) {
    if (params.colorFilter.include) {
      fragments.push(
        Prisma.sql`h.color_id = ANY(${params.colorFilter.colors})`,
      );
    } else {
      fragments.push(
        Prisma.sql`NOT (h.color_id = ANY(${params.colorFilter.colors}))`,
      );
    }
  }

  return fragments;
}

/**
 * Gets aggregated pixel history counts per user with profile information.
 */
async function getPixelHistoryUserCounts(
  fetchParams: GetPixelHistoryParams,
): Promise<PixelHistoryUserCountRow[]> {
  const whereFragments = buildPixelHistoryWhereSQL(fetchParams);

  // Combine fragments with AND
  const whereSQL =
    whereFragments.length === 1 ?
      whereFragments[0]
    : Prisma.sql`${Prisma.join(whereFragments, " AND ")}`;

  const results = await prisma.$queryRaw<PixelHistoryUserCountRawResult[]>`
    SELECT
      h.user_id,
      COUNT(*) as count_all,
      MAX(h.timestamp) as max_timestamp,
      MIN(h.timestamp) as min_timestamp,
      p.user_id as profile_user_id,
      p.username,
      p.profile_picture_url
    FROM history h
    LEFT JOIN discord_user_profile p ON p.user_id = h.user_id
    WHERE ${whereSQL}
    GROUP BY h.user_id, p.user_id, p.username, p.profile_picture_url
  `;

  return results.map((row) => ({
    user_id: row.user_id,
    _count: {
      _all: Number(row.count_all),
    },
    _max: {
      timestamp: row.max_timestamp,
    },
    _min: {
      timestamp: row.min_timestamp,
    },
    discord_user_profile:
      row.profile_user_id !== null && row.username !== null ?
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
 * Uses a single SQL query with LEFT JOIN instead of separate groupBy + findMany calls.
 */
async function getPixelHistoryUserColorCounts(
  fetchParams: GetPixelHistoryParams,
): Promise<PixelHistoryUserColorCountRow[]> {
  const whereFragments = buildPixelHistoryWhereSQL(fetchParams);

  // Combine fragments with AND
  const whereSQL =
    whereFragments.length === 1 ?
      whereFragments[0]
    : Prisma.sql`${Prisma.join(whereFragments, " AND ")}`;

  const results = await prisma.$queryRaw<PixelHistoryUserColorCountRawResult[]>`
    SELECT
      h.user_id,
      h.color_id,
      COUNT(*) as count_all,
      p.user_id as profile_user_id,
      p.username,
      p.profile_picture_url
    FROM history h
    LEFT JOIN discord_user_profile p ON p.user_id = h.user_id
    WHERE ${whereSQL}
    GROUP BY h.user_id, h.color_id, p.user_id, p.username, p.profile_picture_url
  `;

  return results.map((row) => ({
    user_id: row.user_id,
    color_id: row.color_id,
    _count: {
      _all: Number(row.count_all),
    },
    discord_user_profile:
      row.profile_user_id !== null && row.username !== null ?
        {
          user_id: row.profile_user_id,
          username: row.username,
          profile_picture_url: row.profile_picture_url,
        }
      : null,
  }));
}

function buildPixelHistoryUsers(
  userCounts: PixelHistoryUserCountRow[],
  userColorCounts: PixelHistoryUserColorCountRow[],
) {
  const users: PixelHistoryWrapper["users"] = {};

  for (const userCount of userCounts) {
    users[userCount.user_id.toString()] = {
      count: userCount._count._all,
      colors: {},
      firstPlaced: userCount._min.timestamp ?? new Date(0),
      lastPlaced: userCount._max.timestamp ?? new Date(0),
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
    userSummary.colors[colorCount.color_id.toString()] = colorCount._count._all;
  }

  return users;
}

/**
 * Gets the pixel history summary for the given canvas and coordinates
 *
 * @param canvasId - The ID of the canvas
 * @param points - The coordinates of the pixel
 * @param dateRange - The date range for filtering history
 * @param userIdFilter - The user ID filter
 * @param colorFilter - The color filter
 */
export async function getPixelHistorySummary(
  {
    canvasId,
    points,
    dateRange,
    userIdFilter,
    colorFilter,
  }: GetPixelHistoryParams,
  includeSummary: boolean = false,
): Promise<PixelHistoryWrapper> {
  if (!Array.isArray(points)) {
    await validatePixel(canvasId, points, false);
  } else {
    await Promise.all([
      validatePixel(canvasId, points[0], false),
      validatePixel(canvasId, points[1], false),
    ]);
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
    limit: 100,
  });

  const summaryPromise =
    includeSummary ?
      Promise.all([
        getPixelHistoryUserCounts(fetchParams),
        getPixelHistoryUserColorCounts(fetchParams),
      ] as const)
    : Promise.resolve(null);

  const [{ rows: pixelHistoryRows, totalCount }, summary] = await Promise.all([
    pixelHistoryAndCountPromise,
    summaryPromise,
  ]);

  const users = summary ? buildPixelHistoryUsers(...summary) : undefined;

  return {
    pixelHistory: pixelHistoryRows.map(mapPixelHistoryRow),
    totalEntries: totalCount,
    users,
  };
}

/**
 * Deletes pixel history entries matching the filter criteria
 *
 * @param params - Filter parameters to match history entries for deletion
 * @param shouldBlockAuthors - Whether to add authors of the deleted entries to the blocklist
 */
export async function deletePixelHistoryEntries(
  params: GetPixelHistoryParams,
  shouldBlockAuthors: boolean = false,
): Promise<void> {
  // Validate pixels
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

  const whereFragments = buildPixelHistoryWhereSQL(params);

  // Combine fragments with AND
  let whereSQL: Prisma.Sql;
  if (whereFragments.length === 0) {
    whereSQL = Prisma.sql`TRUE`;
  } else {
    whereSQL =
      whereFragments.length === 1 ?
        whereFragments[0]
      : Prisma.sql`${Prisma.join(whereFragments, " AND ")}`;
  }

  const erasedAt = new Date();

  // Update entries and get their data in a single query
  interface DeletedEntry {
    id: bigint;
    user_id: bigint;
    x: number;
    y: number;
  }

  const deletedEntries = await prisma.$queryRaw<DeletedEntry[]>`
    UPDATE history h
    SET erased_at = ${erasedAt}
    WHERE ${whereSQL}
    RETURNING id, user_id, x, y
  `;

  if (deletedEntries.length === 0) {
    return;
  }

  const coordinatesUpdated = [
    ...new Map(
      deletedEntries.map((entry) => [
        `${entry.x}:${entry.y}`,
        { x: entry.x, y: entry.y },
      ]),
    ).values(),
  ];

  await restorePixelsAfterHistoryDeletion(params.canvasId, coordinatesUpdated);

  if (shouldBlockAuthors) {
    const authorIds = new Set(deletedEntries.map((entry) => entry.user_id));
    await addUsersToBlocklist(authorIds);
  }
}
