import type {
  CanvasInfo,
  PixelHistoryUserSummary,
  PixelHistoryWrapper,
  Point,
} from "@blurple-canvas-web/types";
import { type Prisma, prisma } from "@/client";
import { addUsersToBlocklist } from "./blocklistService";
import { toPaletteColorSummary } from "./paletteService";
import {
  restorePixelsAfterHistoryDeletion,
  validatePixel,
} from "./pixelService";

const formatter = new Intl.ListFormat("en-US");

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

const pixelHistoryIdSelect = {
  id: true,
} as const satisfies Prisma.historySelect;

type PixelHistoryUserCountRow = {
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
};

type PixelHistoryUserColorCountRow = {
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
};

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
  fetchData,
  limit,
}: {
  fetchData: GetPixelHistoryParams;
  limit?: number;
}) {
  return prisma.history.findMany({
    take: limit,
    orderBy: {
      timestamp: "desc",
    },
    where: buildPixelHistoryWhere(fetchData),
    select: pixelHistorySelect,
  });
}

async function getPixelHistoryIds(fetchData: GetPixelHistoryParams) {
  return prisma.history.findMany({
    orderBy: {
      timestamp: "desc",
    },
    where: buildPixelHistoryWhere(fetchData),
    select: pixelHistoryIdSelect,
  });
}

async function getPixelHistoryUserCounts(fetchData: GetPixelHistoryParams) {
  const groupedRows = await prisma.history.groupBy({
    by: ["user_id"],
    where: buildPixelHistoryWhere(fetchData),
    _count: {
      _all: true,
    },
    _max: {
      timestamp: true,
    },
    _min: {
      timestamp: true,
    },
  });

  const userIds = groupedRows.map((row) => row.user_id);
  const userProfiles = await prisma.discord_user_profile.findMany({
    where: {
      user_id: {
        in: userIds,
      },
    },
    select: {
      user_id: true,
      username: true,
      profile_picture_url: true,
    },
  });

  const profileMap = new Map(
    userProfiles.map((profile) => [profile.user_id, profile]),
  );

  return groupedRows.map((row) => ({
    ...row,
    discord_user_profile: profileMap.get(row.user_id) ?? null,
  })) as PixelHistoryUserCountRow[];
}

async function getPixelHistoryUserColorCounts(
  fetchData: GetPixelHistoryParams,
) {
  const groupedRows = await prisma.history.groupBy({
    by: ["user_id", "color_id"],
    where: buildPixelHistoryWhere(fetchData),
    _count: {
      _all: true,
    },
  });

  const userIds = [...new Set(groupedRows.map((row) => row.user_id))];
  const userProfiles = await prisma.discord_user_profile.findMany({
    where: {
      user_id: {
        in: userIds,
      },
    },
    select: {
      user_id: true,
      username: true,
      profile_picture_url: true,
    },
  });

  const profileMap = new Map(
    userProfiles.map((profile) => [profile.user_id, profile]),
  );

  return groupedRows.map((row) => ({
    ...row,
    discord_user_profile: profileMap.get(row.user_id) ?? null,
  })) as PixelHistoryUserColorCountRow[];
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

    if (!userSummary) {
      continue;
    }

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

  const fetchData: GetPixelHistoryParams = {
    canvasId,
    points: normalizedPoints,
    dateRange,
    userIdFilter,
    colorFilter,
  };

  const pixelHistoryPromise = getPixelHistoryRows({
    fetchData,
    limit: 100,
  });

  const historyIdsPromise =
    includeSummary ? getPixelHistoryIds(fetchData) : null;

  const totalEntriesPromise =
    historyIdsPromise ?
      historyIdsPromise.then((historyIds) => historyIds.length)
    : prisma.history.count({
        where: buildPixelHistoryWhere(fetchData),
      });

  const summaryPromise =
    historyIdsPromise ?
      Promise.all([
        historyIdsPromise,
        getPixelHistoryUserCounts(fetchData),
        getPixelHistoryUserColorCounts(fetchData),
      ] as const)
    : Promise.resolve(null);

  const [pixelHistory, totalEntries, summary] = await Promise.all([
    pixelHistoryPromise,
    totalEntriesPromise,
    summaryPromise,
  ]);

  const users =
    summary ? buildPixelHistoryUsers(summary[1], summary[2]) : undefined;
  const historyIds =
    summary ? summary[0].map((history) => history.id.toString()) : undefined;

  return {
    pixelHistory: pixelHistory.map(mapPixelHistoryRow),
    totalEntries,
    historyIds,
    users,
  };
}

/**
 * Deletes pixel history entries for the given canvas and history IDs
 *
 * @param canvasId - The ID of the canvas
 * @param historyIds - The IDs of the history entries to delete
 * @param shouldBlockAuthors - Whether to add authors of the deleted entries to the blocklist
 */
export async function deletePixelHistoryEntries(
  canvasId: CanvasInfo["id"],
  historyIds: bigint[],
  shouldBlockAuthors: boolean = false,
): Promise<void> {
  // First, check that all history entries exist and belong to the specified canvas
  const existingEntries = await prisma.history.findMany({
    where: {
      erased_at: null,
      canvas_id: canvasId,
      id: {
        in: historyIds,
      },
    },
    select: {
      id: true,
      user_id: true,
      x: true,
      y: true,
    },
  });

  const existingEntryIds = new Set(existingEntries.map((entry) => entry.id));

  const invalidIds = new Set(historyIds).difference(existingEntryIds);
  if (invalidIds.size > 0) {
    throw new Error(
      `The following history IDs do not exist for canvas ${canvasId}: ${formatter.format([...invalidIds].map((id) => id.toString()))}`,
    );
  }

  const erasedAt = new Date();

  await prisma.history.updateMany({
    where: {
      canvas_id: canvasId,
      id: {
        in: historyIds,
      },
    },
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

  await restorePixelsAfterHistoryDeletion(canvasId, coordinatesUpdated);

  if (shouldBlockAuthors) {
    const authorIds = new Set(existingEntries.map((entry) => entry.user_id));
    await addUsersToBlocklist(authorIds);
  }
}
