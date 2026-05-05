import type {
  PaletteColor,
  PixelColor,
  Point,
} from "@blurple-canvas-web/types";

import { type color, prisma } from "@/client";
import config from "@/config";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/errors";
import { socketHandler } from "@/index";
import { userIsBlocklisted } from "./blocklistService";
import { updateCachedCanvasPixel } from "./canvasService";

const BLANK_PIXEL_COLOR_ID = 1;

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
 * Ensures that the given user is not blocklisted from placing pixels
 */
export async function validateUser(userId: bigint) {
  if (await userIsBlocklisted(userId)) {
    throw new ForbiddenError("User is blocklisted");
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

/**
 * Rebuilds the current pixel state for the given coordinates after history entries are removed.
 *
 * @param canvasId - The ID of the canvas
 * @param coordinates - The coordinates that need to be refreshed
 */
export async function restorePixelsAfterHistoryDeletion(
  canvasId: number,
  coordinates: Point[],
): Promise<void> {
  const uniqueCoordinates = new Map<string, Point>();

  for (const coordinate of coordinates) {
    uniqueCoordinates.set(`${coordinate.x}:${coordinate.y}`, coordinate);
  }

  const blankColor = (await prisma.color.findUnique({
    where: {
      id: BLANK_PIXEL_COLOR_ID,
    },
    select: {
      rgba: true,
    },
  })) as { rgba: PixelColor } | null;

  if (!blankColor) {
    throw new NotFoundError(
      `There is no color with ID ${BLANK_PIXEL_COLOR_ID}`,
    );
  }

  for (const coordinate of uniqueCoordinates.values()) {
    const latestHistoryEntry = await prisma.history.findFirst({
      where: {
        erased_at: null,
        canvas_id: canvasId,
        x: coordinate.x,
        y: coordinate.y,
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      select: {
        color_id: true,
        color: {
          select: {
            rgba: true,
          },
        },
      },
    });

    const pixelColorId = latestHistoryEntry?.color_id ?? BLANK_PIXEL_COLOR_ID;
    const pixelColor =
      (latestHistoryEntry?.color.rgba as PixelColor) ?? blankColor.rgba;

    await prisma.pixel.upsert({
      where: {
        canvas_id_x_y: {
          canvas_id: canvasId,
          ...coordinate,
        },
      },
      create: {
        canvas_id: canvasId,
        ...coordinate,
        color_id: pixelColorId,
      },
      update: {
        color_id: pixelColorId,
      },
    });

    socketHandler.broadcastPixelPlacement(canvasId, {
      x: coordinate.x,
      y: coordinate.y,
      rgba: pixelColor,
    });

    updateCachedCanvasPixel(canvasId, coordinate, pixelColor);
  }
}
