import type {
  CanvasInfo,
  PixelHistory,
  PixelHistoryWrapper,
  Point,
} from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { addUsersToBlocklist } from "./blocklistService";
import { toPaletteColorSummary } from "./paletteService";
import { validatePixel } from "./pixelService";

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
}

/**
 * Gets the pixel history for the given canvas and coordinates
 *
 * @param canvasId - The ID of the canvas
 * @param points - The coordinates of the pixel
 */
export async function getPixelHistory({
  canvasId,
  points,
  dateRange,
  userIdFilter,
}: GetPixelHistoryParams): Promise<PixelHistoryWrapper> {
  if (!Array.isArray(points)) {
    await validatePixel(canvasId, points, false);
    points = [points, points];
  } else {
    await Promise.all([
      validatePixel(canvasId, points[0], false),
      validatePixel(canvasId, points[1], false),
    ]);
  }

  const where = {
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
      if (!userIdFilter) {
        return undefined;
      }
      if (userIdFilter.include) {
        return { in: userIdFilter.ids };
      } else {
        return { notIn: userIdFilter.ids };
      }
    })(),
  };

  const [pixelHistory, totalEntries] = await Promise.all([
    prisma.history.findMany({
      take: 100,
      orderBy: {
        timestamp: "desc",
      },
      where,
      select: {
        id: true,
        color: true,
        timestamp: true,
        guild_id: true,
        user_id: true,
        discord_user_profile: true,
      },
    }),
    prisma.history.count({
      where: where,
    }),
  ]);

  return {
    pixelHistory: pixelHistory.map((history) => ({
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
    })),
    totalEntries,
  };
}

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
    const formatter = new Intl.ListFormat("en-US");
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
    await addUsersToBlocklist(authorIds, true);
  }
}
