import { PixelHistoryWrapper, Point } from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { toPaletteColorSummary } from "./paletteService";
import { validatePixel } from "./pixelService";

interface GetPixelHistoryParams {
  canvasId: number;
  coordinates: Point | [Point, Point];
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
 * @param coordinates - The coordinates of the pixel
 */
export async function getPixelHistory({
  canvasId,
  coordinates,
  dateRange,
  userIdFilter,
}: GetPixelHistoryParams): Promise<PixelHistoryWrapper> {
  if (!Array.isArray(coordinates)) {
    await validatePixel(canvasId, coordinates, false);
    coordinates = [coordinates, coordinates];
  } else {
    await Promise.all([
      validatePixel(canvasId, coordinates[0], false),
      validatePixel(canvasId, coordinates[1], false),
    ]);
  }

  const whereFilter = {
    canvas_id: canvasId,
    x: {
      gte: coordinates[0].x,
      lte: coordinates[1].x,
    },
    y: {
      gte: coordinates[0].y,
      lte: coordinates[1].y,
    },
    timestamp: {
      gte: dateRange?.from,
      lte: dateRange?.to,
    },
    user_id:
      userIdFilter ?
        userIdFilter.include ?
          { in: userIdFilter.ids }
        : { notIn: userIdFilter.ids }
      : undefined,
  };

  const [pixelHistory, totalEntries] = await Promise.all([
    prisma.history.findMany({
      take: 100,
      orderBy: {
        timestamp: "desc",
      },
      where: whereFilter,
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
      where: whereFilter,
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
