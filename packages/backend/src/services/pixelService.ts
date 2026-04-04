import {
  PaletteColor,
  PixelColor,
  PixelHistoryWrapper,
  Point,
} from "@blurple-canvas-web/types";
import { color } from "@prisma/client";

import { prisma } from "@/client";
import config from "@/config";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/errors";
import { socketHandler } from "@/index";
import { updateCachedCanvasPixel } from "./canvasService";

/**
 * Gets the pixel history for the given canvas and coordinates
 *
 * @param canvasId - The ID of the canvas
 * @param coordinates - The coordinates of the pixel
 */
export async function getPixelHistory(
  canvasId: number,
  coordinates: Point,
): Promise<PixelHistoryWrapper> {
  // check if canvas exists
  await validatePixel(canvasId, coordinates, false);

  const [pixelHistory, totalEntries] = await Promise.all([
    prisma.history.findMany({
      take: 100,
      orderBy: {
        timestamp: "desc",
      },
      where: {
        canvas_id: canvasId,
        ...coordinates,
      },
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
      where: {
        canvas_id: canvasId,
        ...coordinates,
      },
    }),
  ]);

  return {
    pixelHistory: pixelHistory.map((history) => ({
      id: history.id.toString(),
      color: history.color,
      timestamp: history.timestamp,
      guildId: history.guild_id?.toString(),
      userId: history.user_id.toString(),
      userProfile: history.discord_user_profile
        ? {
            id: history.discord_user_profile.user_id.toString(),
            username: history.discord_user_profile.username,
            profilePictureUrl: history.discord_user_profile.profile_picture_url,
          }
        : null,
    })),
    totalEntries,
  };
}

/** Ensures that the given pixel coordinates are within the bounds of the canvas and the canvas exists
 *
 * @param canvasId - The ID of the canvas
 * @param coordinates - The coordinates of the pixel
 * @param honorLocked - True will return an error if the canvas is locked
 */
export async function validatePixel(
  canvasId: number,
  coordinates: Point,
  honorLocked: boolean,
) {
  const canvas = await prisma.canvas.findFirst({
    where: {
      id: canvasId,
    },
  });

  if (!canvas) {
    throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
  }

  // check if pixel is within bounds
  if (coordinates.x < 0 || coordinates.x >= canvas.width) {
    throw new BadRequestError(
      `X coordinate ${coordinates.x} is out of bounds for canvas ${canvasId}`,
    );
  }

  if (coordinates.y < 0 || coordinates.y >= canvas.height) {
    throw new BadRequestError(
      `Y coordinate ${coordinates.y} is out of bounds for canvas ${canvasId}`,
    );
  }

  if (honorLocked && canvas.locked) {
    throw new ForbiddenError(`Canvas with ID ${canvasId} is locked`);
  }
}

/**
 * Ensures that the given color exists in the DB and it is allowed to be used in the given canvas
 *
 * @param colorId - The ID of the color
 * @returns The corresponding color object
 */
export async function validateColor(
  colorId: number,
): Promise<color & { rgba: PixelColor }> {
  const color = (await prisma.color.findFirst({
    where: {
      id: colorId,
    },
  })) as (color & { rgba: PixelColor }) | null;

  if (!color) {
    throw new NotFoundError(`There is no color with ID ${colorId}`);
  }

  if (!color.global && !config.allColorsGlobal) {
    throw new ForbiddenError(
      `Partnered color with ID ${colorId} is not allowed from web client`,
    );
  }

  return color;
}

/**
 * Ensures that the given user is not blacklisted from placing pixels
 */
export async function validateUser(userId: bigint) {
  const blacklist = await prisma.blacklist.findFirst({
    where: {
      user_id: userId,
    },
  });

  if (blacklist) {
    throw new ForbiddenError("User is blacklisted");
  }
}

/**
 * Gets the current and future (after pixel placement) cooldown time for the given canvas
 *
 * @param canvasId - The ID of the canvas
 * @param userId - The ID of the user
 * @param placementTime - The time that the pixel will be placed
 *
 * @remarks
 *
 * Some canvases may not have a placement cooldown timer set,
 * which means that returned values can be null and need to be handled
 *
 * @returns The current and future cooldown time
 */
export async function getCooldown(
  canvasId: number,
  userId: bigint,
  placementTime: Date,
) {
  const canvas = await prisma.canvas.findFirst({
    where: {
      id: canvasId,
    },
  });
  const cooldown = await prisma.cooldown.findFirst({
    where: {
      user_id: userId,
      canvas_id: canvasId,
    },
  });

  // Don't need to return cooldown if canvas itself doesn't have cooldown
  if (!canvas?.cooldown_length) {
    return { currentCooldown: null, futureCooldown: null };
  }

  const futureCooldown = new Date(
    placementTime.valueOf() + canvas.cooldown_length * 1000,
  );

  // Return early if no cooldown exists
  if (!cooldown?.cooldown_time) {
    return { currentCooldown: null, futureCooldown };
  }

  const currentCooldown = cooldown.cooldown_time;

  if (placementTime <= currentCooldown) {
    throw new ForbiddenError("Pixel placement is on cooldown");
  }
  return { currentCooldown, futureCooldown };
}

/**
 * Places a pixel in the given canvas and updates the cooldown and history tables
 * This function also applies optimistic locking on the cooldown table
 *
 * @remarks
 *
 * This function assumes that the user already exists in the DB,
 * however the placement still works if the user doesn't exist.
 *
 * @param canvasId - The ID of the canvas
 * @param userId - The ID of the user
 * @param coordinates - The coordinates of the pixel
 * @param color - The color of the pixel
 */
export async function placePixel(
  canvasId: number,
  userId: bigint,
  coordinates: Point,
  color: Pick<PaletteColor, "id" | "rgba">,
) {
  const placementTime = new Date();
  let { currentCooldown, futureCooldown } = await getCooldown(
    canvasId,
    userId,
    placementTime,
  );

  await prisma.$transaction(async (tx) => {
    // only update the cooldown table if the canvas has a cooldown
    if (futureCooldown) {
      // create the cooldown if it doesn't exist already
      if (!currentCooldown) {
        const cooldown = await tx.cooldown.create({
          data: {
            user_id: userId,
            canvas_id: canvasId,
            cooldown_time: futureCooldown,
          },
        });
        currentCooldown = cooldown.cooldown_time;
      }
      // Perform an update with an attempt at an optimistic query
      const updateCooldown = await tx.cooldown.update({
        where: {
          user_id_canvas_id: {
            user_id: userId,
            canvas_id: canvasId,
          },
          cooldown_time: currentCooldown,
        },
        data: {
          cooldown_time: futureCooldown,
        },
      });
      if (!updateCooldown) {
        throw new ForbiddenError("Pixel placement is on cooldown");
      }
    }
    await tx.pixel.upsert({
      where: {
        canvas_id_x_y: {
          canvas_id: canvasId,
          ...coordinates,
        },
      },
      create: {
        canvas_id: canvasId,
        ...coordinates,
        color_id: color.id,
      },
      update: {
        color_id: color.id,
      },
    });
    await tx.history.create({
      data: {
        canvas_id: canvasId,
        user_id: userId,
        x: coordinates.x,
        y: coordinates.y,
        color_id: color.id,
        timestamp: placementTime,
        guild_id: config.webGuildId,
      },
    });
  });

  socketHandler.broadcastPixelPlacement(canvasId, {
    x: coordinates.x,
    y: coordinates.y,
    rgba: color.rgba,
  });

  // Only update the cache if the transaction is successful
  updateCachedCanvasPixel(canvasId, coordinates, color.rgba);
  return { futureCooldown };
}
