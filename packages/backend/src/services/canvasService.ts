import fs from "node:fs";
import type {
  BlurpleEvent,
  CanvasInfo,
  CanvasSummary,
  PixelColor,
  Point,
} from "@blurple-canvas-web/types";
import { PNG } from "pngjs";
import { type canvas, Prisma, prisma } from "@/client";
import config from "@/config";
import { NotFoundError } from "@/errors";
import { socketHandler } from "@/index";
import type { PlacePixelArray } from "@/models/pixel.models";
import { getCurrentEvent } from "./eventService";
import { getEventPalette } from "./paletteService";
import { type BulkPlaceEntry, createBulkPlaceEntries } from "./pixelService";

/**
 * A locked canvas cannot be edited by users. It is therefore, safe to store it as an image on the
 * file system.
 */
interface LockedCanvas {
  isLocked: true;
  canvasPath: string;
}

/**
 * An unlocked canvas can be edited by users so the pixels are stored in memory. This allows for
 * easy updating of the canvas, while also allowing it to be rapidly returned from requests (as
 * most of the time to build a canvas image from scratch is fetching the pixels from the database).
 */
interface UnlockedCanvas {
  isLocked: false;
  width: number;
  height: number;
  pixels: PixelColor[];
}

export type CachedCanvas = LockedCanvas | UnlockedCanvas;

/**
 * An in-memory cache of canvases. Each canvas is either the width, height and pixels of the image
 * or if the image is locked (and therefore cannot be modified) the path to the canvas image on the
 * file system.
 */
const CANVAS_CACHE: Map<number, CachedCanvas> = new Map();

export function initializeCache(): void {
  // look through the files in the canvas directory and build the locked cache object from them
  for (const filename of fs.readdirSync(config.paths.canvases)) {
    const match = filename.match(/^blurple-canvas__(\d+)__locked.png$/);

    if (!match) {
      return;
    }

    const canvasId = Number.parseInt(match[1], 10);
    const canvasPath = `${config.paths.canvases}/${filename}`;

    console.log(`Loaded cached canvas ${canvasPath}`);

    CANVAS_CACHE.set(canvasId, {
      isLocked: true,
      canvasPath: `${config.paths.canvases}/${filename}`,
    });
  }
}

/**
 * Generates a filename for a canvas image. If the canvas is not locked (And therefore, can change)
 * the filename will include the current timestamp.
 *
 * @param canvasId The ID of the canvas
 * @param isLocked Whether the canvas is locked or not
 * @returns The generated filename
 */
export function getCanvasFilename(canvasId: number, isLocked = false): string {
  return `blurple-canvas__${canvasId}__${isLocked ? "locked" : Date.now()}.png`;
}

/**
 * Converts an unlocked canvas from the cache to a PNG image.
 *
 * @param unlockedCanvas The unlocked canvas to convert
 * @returns The PNG image
 */
export function unlockedCanvasToPng(unlockedCanvas: UnlockedCanvas): PNG {
  return pixelsToPng(
    unlockedCanvas.width,
    unlockedCanvas.height,
    unlockedCanvas.pixels,
  );
}

interface CanvasSummaryRow {
  id: number;
  name: string;
  event_id: number | null;
  locked: boolean;
  last_pixel_timestamp: Date | null;
  width: number;
  height: number;
  cooldown_length: number;
}

/**
 * Retrieves canvas summary info for all canvases.
 *
 * @param eventId If provided, only canvases for the specified event will be returned
 * @returns The canvas summary info of all canvases
 */
export async function getCanvases(
  eventId?: BlurpleEvent["id"],
): Promise<CanvasSummary[]> {
  const whereSql =
    eventId === undefined ?
      Prisma.sql`TRUE`
    : Prisma.sql`c.event_id = ${eventId}`;

  const canvases = await prisma.$queryRaw<CanvasSummaryRow[]>`
    SELECT
      c.id,
      c.name,
      c.event_id,
      c.locked,
      c.width,
      c.height,
      c.cooldown_length,
      MAX(h.timestamp) AS last_pixel_timestamp
    FROM canvas c
    LEFT JOIN history h
      ON h.canvas_id = c.id
      AND h.erased_at IS NULL
    WHERE ${whereSql}
    GROUP BY c.id, c.name, c.event_id, c.locked, c.width, c.height
    ORDER BY
      MAX(h.timestamp) DESC NULLS LAST,
      c.id DESC
  `;

  return canvases.map((canvas) => ({
    id: canvas.id,
    name: canvas.name,
    eventId: canvas.event_id,
    isLocked: canvas.locked,
    width: canvas.width,
    height: canvas.height,
    cooldownDuration: canvas.cooldown_length,
  }));
}

/**
 * Retrieves canvas info from the cache of the default canvas ID defined in the database.
 *
 * @returns The canvas info of the default canvas
 */
export async function getCurrentCanvasInfo(): Promise<CanvasInfo> {
  const info = await prisma.info.findFirst({
    select: { default_canvas_id: true },
  });

  // To get rid of the nullable type from info. This should never happen
  if (!info) {
    throw new Error("The info table is empty! 😱");
  }

  return getCanvasInfo(info.default_canvas_id);
}

/**
 * Retrieves the info for a canvas.
 *
 * @param canvasId The ID of the canvas to retrieve the info for
 * @returns The canvas info
 */
export async function getCanvasInfo(canvasId: number): Promise<CanvasInfo> {
  const canvas = await prisma.canvas.findFirst({
    select: {
      id: true,
      name: true,
      width: true,
      height: true,
      start_coordinates: true,
      locked: true,
      event_id: true,
      cooldown_length: true,
      all_colors_global: true,
    },
    where: {
      id: canvasId,
    },
  });

  if (!canvas) {
    throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
  }

  return canvasToCanvasInfo(canvas);
}

/**
 * Retrieves a canvas from the cache using the default canvas ID defined in the database.
 *
 * @returns A tuple containing the id of the canvas and the cached canvas
 */
export async function getCurrentCanvas(): Promise<[number, CachedCanvas]> {
  const info = await prisma.info.findFirst({
    select: { default_canvas_id: true },
  });

  // To get rid of the nullable type from info. This should never happen
  if (!info) {
    throw new Error("The info table is empty! 😱");
  }

  const defaultCanvasId = info.default_canvas_id;
  const cachedCanvas = await getCanvasPng(defaultCanvasId);

  return [defaultCanvasId, cachedCanvas];
}

/**
 * Retrieves a canvas from the cache. If the canvas is not in the cache it will be fetched from the
 * database and added to it.
 *
 * @param canvasId The ID of the canvas to retrieve
 * @returns The cached canvas
 */
export async function getCanvasPng(canvasId: number): Promise<CachedCanvas> {
  return getOrFetchCacheCanvas(canvasId);
}

/**
 * Clears a canvas from the in-memory cache. If the canvas is locked, the cached image is also
 * removed from the file system.
 *
 * @param canvasId The ID of the canvas to clear from cache
 */
export async function clearCachedCanvas(canvasId: number): Promise<void> {
  await clearCanvasFromFileSystem(canvasId);
  CANVAS_CACHE.delete(canvasId);
  console.debug(`Cleared canvas ${canvasId} from cache`);
}

/**
 * Updates many pixels in the canvas cache at once. If the canvas is not in the cache or the canvas
 * is locked this will do nothing.
 *
 * @param canvasId The ID of the canvas to update
 * @param pixels The new pixel values
 */
export async function updateManyCachedPixels(
  canvasId: number,
  pixels: PlacePixelArray,
): Promise<void> {
  const cachedCanvas = CANVAS_CACHE.get(canvasId);

  if (!cachedCanvas || cachedCanvas.isLocked) {
    return;
  }

  for (const pixel of pixels) {
    const pixelIndex = pixel.y * cachedCanvas.width + pixel.x;
    cachedCanvas.pixels[pixelIndex] = pixel.rgba;
  }
}

/**
 * Updates a pixel in the canvas cache. If the canvas is not in the cache, or the canvas is locked
 * this will do nothing.
 *
 * @param canvasId The ID of the canvas to update
 * @param coordinates The coordinates of the pixel
 * @param color The color of the pixel
 */
export function updateCachedCanvasPixel(
  canvasId: CanvasInfo["id"],
  coordinates: Point,
  color: PixelColor,
) {
  const cachedCanvas = CANVAS_CACHE.get(canvasId);

  if (!cachedCanvas || cachedCanvas.isLocked) {
    return;
  }

  const pixelIndex = coordinates.y * cachedCanvas.width + coordinates.x;
  cachedCanvas.pixels[pixelIndex] = color;
}

export async function getCanvasPixels(canvasId: number): Promise<PixelColor[]> {
  const pixels = (await prisma.pixel.findMany({
    select: {
      color: {
        select: { rgba: true },
      },
    },
    where: { canvas_id: canvasId },
    orderBy: [{ y: "asc" }, { x: "asc" }],
  })) as { color: { rgba: PixelColor } }[];

  return pixels.map((pixel) => pixel.color.rgba);
}

function pixelsToPng(width: number, height: number, pixels: PixelColor[]): PNG {
  const image = new PNG({ width, height, filterType: 0 });

  pixels.forEach((color, index) => {
    const imageIndex = index * 4;
    image.data[imageIndex] = color[0];
    image.data[imageIndex + 1] = color[1];
    image.data[imageIndex + 2] = color[2];
    image.data[imageIndex + 3] = color[3];
  });

  return image;
}

function saveCanvasToFileSystem(canvas: canvas, pixels: PixelColor[]): string {
  const filename = getCanvasFilename(canvas.id, canvas.locked);
  const path = `${config.paths.canvases}/${filename}`;

  pixelsToPng(canvas.width, canvas.height, pixels)
    .pack()
    .pipe(fs.createWriteStream(path));

  return path;
}

async function clearCanvasFromFileSystem(canvasId: number): Promise<void> {
  const cachedCanvas = CANVAS_CACHE.get(canvasId);

  try {
    if (cachedCanvas?.isLocked) {
      await fs.promises.rm(cachedCanvas.canvasPath);
      console.debug(`Cleared canvas ${canvasId} from file system`);
    }
  } catch {
    console.warn(
      `Failed to clear canvas ${canvasId} from file system. It may have already been removed.`,
    );
  }
}

async function getOrFetchCacheCanvas(canvasId: number): Promise<CachedCanvas> {
  const canvas = await prisma.canvas.findFirst({
    where: { id: canvasId },
  });

  if (!canvas) {
    throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
  }

  const cachedCanvas = CANVAS_CACHE.get(canvasId);
  if (cachedCanvas) {
    if (cachedCanvas.isLocked !== canvas.locked) {
      console.debug(
        `Canvas ${canvasId} lock status has changed. Updating cache...`,
      );
      clearCanvasFromFileSystem(canvasId);
    } else {
      console.debug(`Cache hit for canvas ${canvasId}`);
      return cachedCanvas;
    }
  } else {
    console.debug(`Cache miss for canvas ${canvasId}`);
  }

  const pixels = await getCanvasPixels(canvasId);
  const unlockedCanvas: UnlockedCanvas = {
    isLocked: false,
    width: canvas.width,
    height: canvas.height,
    pixels,
  };

  if (canvas.locked) {
    const path = saveCanvasToFileSystem(canvas, pixels);
    CANVAS_CACHE.set(canvasId, {
      isLocked: true,
      canvasPath: path,
    });

    console.debug(`Canvas ${canvasId} saved to ${path}`);
  } else {
    CANVAS_CACHE.set(canvasId, unlockedCanvas);
    console.debug(`Canvas ${canvasId} cached in memory`);
  }

  // We always want to return the unlocked canvas, even if the image is locked as sometimes the
  // image hasn’t finished being written to the file system when Express tries to send it in the
  // response.
  return unlockedCanvas;
}

interface CreateCanvasParams {
  name: string;
  width: number;
  height: number;
  startCoordinates?: [number, number];
  allColorsGlobal?: boolean;
  cooldownDuration?: number;
}

export async function createCanvas({
  name,
  width,
  height,
  startCoordinates = [1, 1],
  allColorsGlobal = false,
  cooldownDuration = 15,
}: CreateCanvasParams) {
  const currentEventId = await getCurrentEvent();

  const canvas = await prisma.canvas.create({
    data: {
      name,
      width,
      height,
      event_id: currentEventId.id,
      start_coordinates: startCoordinates,
      locked: true,
      cooldown_length: cooldownDuration,
      all_colors_global: allColorsGlobal,
    },
  });

  await createCanvasPixelEntries(canvas.id, width, height);

  socketHandler.broadcastCanvasUpdate(canvasToCanvasInfo(canvas));

  return canvas;
}

async function createCanvasPixelEntries(
  canvasId: number,
  width: number,
  height: number,
): Promise<void> {
  const pixelsData = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixelsData.push({
        canvas_id: canvasId,
        x,
        y,
        color_id: 1, // Defaults to blank color (ID #1)
      });
    }
  }

  console.log(
    `Creating ${pixelsData.length} pixel entries for canvas ${canvasId}`,
  );

  // Insert pixels in batches to avoid overwhelming the database
  const batchSize = 10_000;
  for (let i = 0; i < pixelsData.length; i += batchSize) {
    const batch = pixelsData.slice(i, i + batchSize);
    console.log(
      `Inserting pixels ${i} to ${i + batch.length} for canvas ${canvasId}`,
    );
    await prisma.pixel.createMany({
      data: batch,
    });
  }
}

interface EditCanvasParams {
  canvasId: number;
  name?: string;
  isLocked?: boolean;
  allColorsGlobal?: boolean;
  cooldownDuration?: number;
}

export async function editCanvas({
  canvasId,
  name,
  isLocked,
  allColorsGlobal,
  cooldownDuration,
}: EditCanvasParams) {
  const canvas = await prisma.canvas.update({
    where: {
      id: canvasId,
    },
    data: {
      name,
      locked: isLocked,
      cooldown_length: cooldownDuration,
      all_colors_global: allColorsGlobal,
    },
  });

  if (!canvas) {
    throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
  }

  socketHandler.broadcastCanvasUpdate(canvasToCanvasInfo(canvas));

  socketHandler.broadcastCanvasUpdate(canvasToCanvasInfo(canvas));

  return canvas;
}

export async function isCanvasInCurrentEvent(
  canvasId: number,
): Promise<boolean> {
  const canvas = await prisma.canvas.findUnique({
    where: { id: canvasId },
    select: { event_id: true },
  });

  if (!canvas) {
    throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
  }

  const currentEvent = await getCurrentEvent();
  return canvas.event_id === currentEvent.id;
}

export async function pasteCanvasData(
  canvasId: number,
  authorId: bigint,
  data: [number, number, number][],
): Promise<void> {
  const canvas = await prisma.canvas.findFirst({
    where: { id: canvasId },
  });

  if (!canvas) {
    throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
  }

  if (!canvas.event_id) {
    throw new Error(
      `Canvas with ID ${canvasId} is not associated with an event`,
    );
  }

  const colors = await getEventPalette(canvas.event_id, false);

  // ~~~ Validation ~~~

  const entries = data.map(
    ([x, y, colorId]) =>
      ({
        x,
        y,
        colorId,
      }) as BulkPlaceEntry,
  );

  const lowestX = Math.min(...entries.map(({ x }) => x));
  const lowestY = Math.min(...entries.map(({ y }) => y));
  const highestX = Math.max(...entries.map(({ x }) => x));
  const highestY = Math.max(...entries.map(({ y }) => y));

  if (
    lowestX < 0 ||
    lowestY < 0 ||
    highestX >= canvas.width ||
    highestY >= canvas.height
  ) {
    throw new Error(
      `Data contains coordinates that are out of bounds for canvas with ID ${canvasId}`,
    );
  }

  const uniqueColors = Array.from(
    new Set(entries.map(({ colorId }) => colorId)),
  );
  const invalidColorIds = uniqueColors.filter(
    (colorId) => !colors.some((color) => color.id === colorId),
  );

  if (invalidColorIds.length > 0) {
    throw new Error(
      `Data contains color IDs that are not in the event palette: ${invalidColorIds.join(
        ", ",
      )}`,
    );
  }

  // ~~~ Execution ~~~

  await prisma.user.upsert({
    where: { id: authorId },
    create: { id: authorId },
    update: {},
  });

  await createBulkPlaceEntries({
    canvasId,
    userId: authorId,
    entries,
  });
}

function canvasToCanvasInfo(canvas: canvas): CanvasInfo {
  return {
    id: canvas.id,
    name: canvas.name,
    width: canvas.width,
    height: canvas.height,
    startCoordinates: [
      canvas.start_coordinates[0],
      canvas.start_coordinates[1],
    ],
    isLocked: canvas.locked,
    eventId: canvas.event_id,
    webPlacingEnabled: config.webPlacingEnabled,
    allColorsGlobal: canvas.all_colors_global,
    cooldownDuration: canvas.cooldown_length,
  };
}
