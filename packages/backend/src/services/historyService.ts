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

function buildPixelHistoryWhere({
  canvasId,
  points,
  dateRange,
  userIdFilter,
  colorFilter,
}: GetPixelHistoryParams) {
  points = Array.isArray(points) ? points : [points, points];

  return {
    erased_at: null,
    canvas_id: canvasId,
    x: {
      gte: points[0].x,
      lte: points[1].x,
    },
    y: {
      gte: points[0].y,
      lte: points[1].y,
    },
    timestamp: {
      gte: dateRange?.from,
      lte: dateRange?.to,
    },
    user_id: (() => {
      if (!userIdFilter) return undefined;
      const op = userIdFilter.include ? "in" : "notIn";
      return { [op]: userIdFilter.ids };
    })(),
    color_id: (() => {
      if (!colorFilter) {
        return undefined;
      }
      if (colorFilter.include) {
        return { in: colorFilter.colors };
      } else {
        return { notIn: colorFilter.colors };
      }
    })(),
  };
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

async function getPixelHistoryRows({
  fetchParams,
  limit,
}: {
  fetchParams: GetPixelHistoryParams;
  limit?: number;
}) {
  return prisma.history.findMany({
    take: limit,
    orderBy: {
      timestamp: "desc",
    },
    where: buildPixelHistoryWhere(fetchParams),
    select: pixelHistorySelect,
  });
}

/**
 * Builds parameterized SQL WHERE clause fragments from filter parameters.
 * Uses Prisma.sql for safe parameter binding.
 */
function buildPixelHistoryWhereSQL(
  params: GetPixelHistoryParams,
): Prisma.Sql[] {
  const points = Array.isArray(params.points)
    ? params.points
    : [params.points, params.points];

  const fragments: Prisma.Sql[] = [
    Prisma.sql`h.erased_at IS NULL`,
    Prisma.sql`h.canvas_id = ${params.canvasId}`,
    Prisma.sql`h.x >= ${points[0].x} AND h.x <= ${points[1].x}`,
    Prisma.sql`h.y >= ${points[0].y} AND h.y <= ${points[1].y}`,
  ];

  // Timestamp filter (both are optional)
  if (params.dateRange?.from || params.dateRange?.to) {
    if (params.dateRange?.from && params.dateRange?.to) {
      fragments.push(
        Prisma.sql`h.timestamp >= ${params.dateRange.from} AND h.timestamp <= ${params.dateRange.to}`,
      );
    } else if (params.dateRange?.from) {
      fragments.push(Prisma.sql`h.timestamp >= ${params.dateRange.from}`);
    } else if (params.dateRange?.to) {
      fragments.push(Prisma.sql`h.timestamp <= ${params.dateRange.to}`);
    }
  }

  // User ID filter
  if (params.userIdFilter) {
    if (params.userIdFilter.include) {
      fragments.push(Prisma.sql`h.user_id = ANY(${params.userIdFilter.ids})`);
    } else {
      fragments.push(
        Prisma.sql`NOT (h.user_id = ANY(${params.userIdFilter.ids}))`,
      );
    }
  }

  // Color ID filter
  if (params.colorFilter) {
    if (params.colorFilter.include) {
      fragments.push(Prisma.sql`h.color_id = ANY(${params.colorFilter.colors})`);
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
  let whereSQL: Prisma.Sql;
  if (whereFragments.length === 0) {
    whereSQL = Prisma.sql`TRUE`;
  } else {
    const [first, ...rest] = whereFragments;
    whereSQL = Prisma.sql`${first}${rest.map((f) => Prisma.sql` AND ${f}`)}`;
  }

  const results = await prisma.$queryRaw<
    PixelHistoryUserCountRawResult[]
  >`
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
      row.profile_user_id !== null && row.username !== null
        ? {
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
  let whereSQL: Prisma.Sql;
  if (whereFragments.length === 0) {
    whereSQL = Prisma.sql`TRUE`;
  } else {
    const [first, ...rest] = whereFragments;
    whereSQL = Prisma.sql`${first}${rest.map((f) => Prisma.sql` AND ${f}`)}`;
  }

  const results = await prisma.$queryRaw<
    PixelHistoryUserColorCountRawResult[]
  >`
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
      row.profile_user_id !== null && row.username !== null
        ? {
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

  const pixelHistoryPromise = getPixelHistoryRows({
    fetchParams,
    limit: 100,
  });

  const totalEntriesPromise = prisma.history.count({
    where: buildPixelHistoryWhere(fetchParams),
  });

  const summaryPromise =
    includeSummary ?
      Promise.all([
        getPixelHistoryUserCounts(fetchParams),
        getPixelHistoryUserColorCounts(fetchParams),
      ] as const)
    : Promise.resolve(null);

  const [pixelHistory, totalEntries, summary] = await Promise.all([
    pixelHistoryPromise,
    totalEntriesPromise,
    summaryPromise,
  ]);

  const users = summary ? buildPixelHistoryUsers(...summary) : undefined;

  return {
    pixelHistory: pixelHistory.map(mapPixelHistoryRow),
    totalEntries,
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

  const where = buildPixelHistoryWhere(params);

  // Get entries for pixel restoration and author blocking
  const existingEntries = await prisma.history.findMany({
    where,
    select: {
      id: true,
      user_id: true,
      x: true,
      y: true,
    },
  });

  if (existingEntries.length === 0) {
    return;
  }

  const erasedAt = new Date();

  await prisma.history.updateMany({
    where,
    data: {
      erased_at: erasedAt,
    },
  });

  const coordinatesUpdated = [
    ...new Map(
      existingEntries.map((entry) => [
        `${entry.x}:${entry.y}`,
        { x: entry.x, y: entry.y },
      ]),
    ).values(),
  ];

  await restorePixelsAfterHistoryDeletion(params.canvasId, coordinatesUpdated);

  if (shouldBlockAuthors) {
    const authorIds = new Set(existingEntries.map((entry) => entry.user_id));
    await addUsersToBlocklist(authorIds);
  }
}
