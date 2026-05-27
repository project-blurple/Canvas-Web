import type {
  PaletteColor,
  PixelColor,
  Point,
} from "@blurple-canvas-web/types";

import { type color, type Prisma, prisma } from "@/client";
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
 * Ensures that the given color exists in the DB and it is allowed to be used in the given canvas.
 *
 * Partnered (non-global) colors are gated by two conditions, either of which is sufficient:
 *
 * 1. The canvas has `all_colors_global` enabled (admin override).
 * 2. The color is registered as a participation in the canvas's event and the
 *    user is a member of that participation's guild (verified via the supplied
 *    `userGuildIds` set, which the caller is expected to source from the cached
 *    Discord guild flags).
 *
 * @param colorId - The ID of the color
 * @param canvasId - The ID of the canvas the color is being used on
 * @param userGuildIds - Discord guild IDs the user is a member of (as decimal strings)
 * @returns The corresponding color object
 */
export async function validateColor(
  colorId: number,
  canvasId: number,
  userGuildIds: ReadonlySet<string>,
): Promise<color & { rgba: PixelColor }> {
  const [color, canvas] = await Promise.all([
    prisma.color.findFirst({
      where: {
        id: colorId,
      },
    }) as Promise<(color & { rgba: PixelColor }) | null>,
    prisma.canvas.findFirst({
      where: { id: canvasId },
      select: { all_colors_global: true, event_id: true },
    }),
  ]);

  if (!color) {
    throw new NotFoundError(`There is no color with ID ${colorId}`);
  }

  if (!color.global && !canvas?.all_colors_global) {
    if (canvas?.event_id == null) {
      throw new ForbiddenError(
        `Partnered color with ID ${colorId} cannot be placed on this canvas`,
      );
    }

    const participation = await prisma.participation.findFirst({
      where: { color_id: colorId, event_id: canvas.event_id },
      select: { guild_id: true },
    });

    if (!participation) {
      throw new ForbiddenError(
        `Partnered color with ID ${colorId} is not part of this canvas's event`,
      );
    }

    if (!userGuildIds.has(participation.guild_id.toString())) {
      throw new ForbiddenError(
        `You must be a member of the partner server to use color with ID ${colorId}`,
      );
    }
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
 * Gets the remaining cooldown time in milliseconds for the given user on the given canvas.
 *
 * @param canvasId - The ID of the canvas
 * @param userId - The ID of the user
 *
 * @remarks
 *
 * Returns `null` when the canvas exists but the user has no active cooldown
 * (either because the canvas has no cooldown configured, the user has never placed
 * a pixel on this canvas, or their previous cooldown has already elapsed).
 *
 * @returns The remaining cooldown time in milliseconds, or `null` if no active cooldown
 */
export async function getUserCanvasCooldown(
  canvasId: number,
  userId: bigint,
): Promise<number | null> {
  const canvas = await prisma.canvas.findFirst({
    where: { id: canvasId },
    select: { id: true },
  });

  if (!canvas) {
    throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
  }

  const cooldown = await prisma.cooldown.findFirst({
    where: {
      user_id: userId,
      canvas_id: canvasId,
    },
    select: { cooldown_time: true },
  });

  if (!cooldown?.cooldown_time) {
    return null;
  }

  const remaining = cooldown.cooldown_time.valueOf() - Date.now();
  return remaining > 0 ? remaining : null;
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
  const { futureCooldown } = await getCooldown(canvasId, userId, placementTime);

  await prisma.$transaction(async (tx) => {
    // only update the cooldown table if the canvas has a cooldown
    if (futureCooldown) {
      const rows = await tx.$queryRaw<[{ user_id: bigint }?]>`
        INSERT INTO cooldown (user_id, canvas_id, cooldown_time)
        VALUES (${userId}::bigint, ${canvasId}::integer, ${futureCooldown}::timestamptz)
        ON CONFLICT (user_id, canvas_id) DO UPDATE
          SET cooldown_time = EXCLUDED.cooldown_time
          WHERE cooldown.cooldown_time IS NULL
             OR cooldown.cooldown_time <= ${placementTime}::timestamptz
        RETURNING user_id
      `;
      if (rows.length === 0) {
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

const COORDINATE_CHUNK_SIZE = 500;

/**
 * Rebuilds the current pixel state for the given coordinates after bulk history operations.
 *
 * @param canvasId - The ID of the canvas
 * @param coordinates - The coordinates that need to be refreshed
 *
 * @remarks
 *
 * Coordinates are processed in chunks to avoid hitting query size limits
 * and ensure predictable performance for large erasures.
 */
export async function restorePixelsAfterHistoryModification(
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

  // Split coordinates into chunks to avoid unbounded OR clauses
  const coordArray = Array.from(uniqueCoordinates.values());
  const chunks: Point[][] = [];

  for (let i = 0; i < coordArray.length; i += COORDINATE_CHUNK_SIZE) {
    chunks.push(coordArray.slice(i, i + COORDINATE_CHUNK_SIZE));
  }

  const latestByCoord = new Map<
    string,
    { x: number; y: number; color_id: number; color: { rgba: PixelColor } }
  >();

  // Process each chunk
  for (const chunk of chunks) {
    // Fetch history for this chunk
    const historyEntries = await prisma.history.findMany({
      where: {
        erased_at: null,
        canvas_id: canvasId,
        OR: chunk.map((c) => ({
          x: c.x,
          y: c.y,
        })),
      },
      select: {
        x: true,
        y: true,
        color_id: true,
        timestamp: true,
        id: true,
        color: { select: { rgba: true } },
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    });

    // Reduce in memory to latest per coordinate
    for (const entry of historyEntries) {
      const key = `${entry.x}:${entry.y}`;
      if (!latestByCoord.has(key)) {
        latestByCoord.set(key, {
          ...entry,
          color: { rgba: entry.color.rgba as PixelColor },
        });
      }
    }

    // Group coordinates by color_id for batch updates
    const byColorId = new Map<number, Point[]>();
    for (const coordinate of chunk) {
      const key = `${coordinate.x}:${coordinate.y}`;
      const latestEntry = latestByCoord.get(key);
      const colorId = latestEntry?.color_id ?? BLANK_PIXEL_COLOR_ID;

      const arr = byColorId.get(colorId);
      if (arr) {
        arr.push(coordinate);
      } else {
        byColorId.set(colorId, [coordinate]);
      }
    }

    // Update all pixels grouped by color_id for this chunk
    for (const [colorId, coords] of byColorId.entries()) {
      await prisma.pixel.updateMany({
        where: {
          canvas_id: canvasId,
          OR: coords.map((c) => ({ x: c.x, y: c.y })),
        },
        data: { color_id: colorId },
      });
    }
  }

  // Build bulk payload and update cache per-pixel
  const pixels: { x: number; y: number; rgba: PixelColor }[] = [];
  for (const coordinate of uniqueCoordinates.values()) {
    const key = `${coordinate.x}:${coordinate.y}`;
    const latestEntry = latestByCoord.get(key);
    const pixelColor =
      (latestEntry?.color.rgba as PixelColor) ?? blankColor.rgba;

    pixels.push({ x: coordinate.x, y: coordinate.y, rgba: pixelColor });

    updateCachedCanvasPixel(canvasId, coordinate, pixelColor);
  }

  if (pixels.length > 0) {
    socketHandler.broadcastPixelBulkPlacement(canvasId, { pixels });
  }
}

export interface BulkPlaceEntry {
  colorId: number;
  x: number;
  y: number;
}

export async function createBulkPlaceEntries({
  canvasId,
  userId,
  guildId,
  timestamp,
  entries,
}: {
  canvasId: number;
  userId: bigint;
  guildId?: bigint;
  timestamp?: Date;
  entries: BulkPlaceEntry[];
}) {
  console.log(
    `Creating ${entries.length} history entries for canvas ${canvasId}`,
  );

  const batchSize = 10_000;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    console.log(
      `Inserting batch ${i / batchSize + 1} (${batch.length} entries)`,
    );

    const data = batch.map(
      (entry) =>
        ({
          canvas_id: canvasId,
          user_id: userId,
          guild_id: guildId,
          color_id: entry.colorId,
          x: entry.x,
          y: entry.y,
          timestamp: timestamp ?? new Date(),
        }) as Prisma.historyCreateManyInput,
    );
    await prisma.history.createMany({
      data,
    });
  }

  await restorePixelsAfterHistoryModification(canvasId, entries);
}
