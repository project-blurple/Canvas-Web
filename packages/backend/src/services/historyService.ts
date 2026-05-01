import type {
  CanvasInfo,
  PixelHistoryWrapper,
  Point,
} from "@blurple-canvas-web/types";
import type { Prisma } from "@/client";
import { prisma } from "@/client";
import { addUsersToBlocklist } from "./blocklistService";
import { toPaletteColorSummary } from "./paletteService";
import { validatePixel } from "./pixelService";

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

function buildPixelHistoryWhere(
  canvasId: CanvasInfo["id"],
  points: [Point, Point],
  dateRange?: GetPixelHistoryParams["dateRange"],
  userIdFilter?: GetPixelHistoryParams["userIdFilter"],
  colorFilter?: GetPixelHistoryParams["colorFilter"],
) {
  return {
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

function summarizePixelHistoryRows(pixelHistoryRows: PixelHistoryRow[]) {
  const users: PixelHistoryWrapper["users"] = {};

  for (const history of pixelHistoryRows) {
    const userId = history.user_id.toString();
    const colorId = history.color.id.toString();
    let userSummary = users[userId];

    if (!userSummary) {
      userSummary = {
        count: 0,
        colors: {},
        lastPlaced: history.timestamp,
      };
      users[userId] = userSummary;
    }

    userSummary.count += 1;
    userSummary.colors[colorId] = (userSummary.colors[colorId] ?? 0) + 1;
  }

  return {
    pixelHistory: pixelHistoryRows.slice(0, 100).map(mapPixelHistoryRow),
    totalEntries: pixelHistoryRows.length,
    historyIds: pixelHistoryRows.map((history) => history.id.toString()),
    users,
  };
}

async function getPixelHistoryRows({
  canvasId,
  points,
  dateRange,
  userIdFilter,
  colorFilter,
  limit,
}: GetPixelHistoryParams & { limit?: number }) {
  if (!Array.isArray(points)) {
    await validatePixel(canvasId, points, false);
    points = [points, points];
  } else {
    await Promise.all([
      validatePixel(canvasId, points[0], false),
      validatePixel(canvasId, points[1], false),
    ]);
  }

  return prisma.history.findMany({
    take: limit,
    orderBy: {
      timestamp: "desc",
    },
    where: buildPixelHistoryWhere(
      canvasId,
      points,
      dateRange,
      userIdFilter,
      colorFilter,
    ),
    select: pixelHistorySelect,
  });
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
export async function getPixelHistorySummary({
  canvasId,
  points,
  dateRange,
  userIdFilter,
  colorFilter,
}: GetPixelHistoryParams): Promise<PixelHistoryWrapper> {
  const [pixelHistory, totalEntries] = await Promise.all([
    getPixelHistoryRows({
      canvasId,
      points,
      dateRange,
      userIdFilter,
      colorFilter,
    }),
    prisma.history.count({
      where: buildPixelHistoryWhere(
        canvasId,
        Array.isArray(points) ? points : [points, points],
        dateRange,
        userIdFilter,
        colorFilter,
      ),
    }),
  ]);

  const summary = summarizePixelHistoryRows(pixelHistory);

  return {
    ...summary,
    totalEntries,
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
      canvas_id: canvasId,
      id: {
        in: historyIds,
      },
    },
    select: {
      id: true,
      user_id: true,
    },
  });

  const existingEntryIds = new Set(existingEntries.map((entry) => entry.id));

  const invalidIds = new Set(historyIds).difference(existingEntryIds);
  if (invalidIds.size > 0) {
    throw new Error(
      `The following history IDs do not exist for canvas ${canvasId}: ${formatter.format([...invalidIds].map((id) => id.toString()))}`,
    );
  }

  await prisma.history.deleteMany({
    where: {
      canvas_id: canvasId,
      id: {
        in: historyIds,
      },
    },
  });

  if (shouldBlockAuthors) {
    const authorIds = new Set(existingEntries.map((entry) => entry.user_id));
    await addUsersToBlocklist(authorIds);
  }
}
