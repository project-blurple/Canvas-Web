import { createReadStream } from "node:fs";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  CANVAS_EXPORT_SCALES,
  type CanvasExportScale,
  type CanvasInfo,
  CanvasPlaceState,
  DEFAULT_CANVAS_EXPORT_SCALE,
  type Frame,
  type FrameExportPackage,
  type PixelColor,
} from "@blurple-canvas-web/types";
import { groupBy } from "es-toolkit";
import sharp from "sharp";
import { type canvas as PrismaCanvas, prisma } from "@/client";
import config from "@/config";
import { BadRequestError } from "@/errors";
import {
  getCanvasFilename,
  getCanvasPng,
  getLockedCanvasPath,
} from "@/services/canvasService";
import { type Bounds, boundsWithDimensions } from "@/utils";
import { getFrameById } from "./frameService";
import { getFrameStatisticsSummary } from "./statisticsService";

export function pixelsToRgbaBuffer(
  pixels: PixelColor[],
  width: number,
  height: number,
): Buffer {
  const expectedPixelCount = width * height;
  const buffer = Buffer.alloc(expectedPixelCount * 4);

  if (pixels.length !== expectedPixelCount) {
    console.warn(
      `Pixel count mismatch when building RGBA buffer: expected ${expectedPixelCount} (${width}x${height}), got ${pixels.length}. The buffer will be padded/truncated to fit.`,
    );
  }

  const pixelsToCopy = Math.min(pixels.length, expectedPixelCount);
  for (let index = 0; index < pixelsToCopy; index += 1) {
    const color = pixels[index];
    if (!color) continue;

    const imageIndex = index * 4;
    buffer[imageIndex] = color[0] ?? 0;
    buffer[imageIndex + 1] = color[1] ?? 0;
    buffer[imageIndex + 2] = color[2] ?? 0;
    buffer[imageIndex + 3] = color[3] ?? 0;
  }

  return buffer;
}

export async function saveCanvasToFileSystem(
  canvas: PrismaCanvas,
  pixels: PixelColor[],
): Promise<Partial<Record<CanvasExportScale, string>>> {
  const rawBuffer = pixelsToRgbaBuffer(pixels, canvas.width, canvas.height);
  const baseImage = sharp(rawBuffer, {
    raw: {
      width: canvas.width,
      height: canvas.height,
      channels: 4,
    },
  });

  const files = await Promise.all(
    CANVAS_EXPORT_SCALES.map(async (scale) => {
      const path = `${config.paths.canvases}/${getCanvasFilename(
        canvas.id,
        true,
        scale,
      )}`;

      await baseImage
        .clone()
        .resize({
          width: canvas.width * scale,
          height: canvas.height * scale,
          kernel: sharp.kernel.nearest,
        })
        .png()
        .toFile(path);

      return [scale, path] as const;
    }),
  );

  return Object.fromEntries(files) as Partial<
    Record<CanvasExportScale, string>
  >;
}

export async function exportFrameAsStream({
  frameId,
  scale = DEFAULT_CANVAS_EXPORT_SCALE,
}: {
  frameId: Frame["id"];
  scale?: CanvasExportScale;
}): Promise<NodeJS.ReadableStream> {
  const frame = await getFrameById(frameId);
  return exportCanvasBoundsAsStream({
    canvasId: frame.canvasId,
    bounds: frame,
    scale,
  });
}

export async function exportCanvasBoundsAsStream({
  canvasId,
  bounds,
  scale = DEFAULT_CANVAS_EXPORT_SCALE,
}: {
  canvasId: CanvasInfo["id"];
  bounds: Bounds;
  scale?: CanvasExportScale;
}): Promise<NodeJS.ReadableStream> {
  const { width, height } = boundsWithDimensions(bounds);
  const { x0, y0 } = bounds;

  if (width <= 0 || height <= 0) {
    throw new BadRequestError("Invalid crop dimensions");
  }

  const cached = await getCanvasPng(canvasId);

  if (cached.placeState === CanvasPlaceState.NoOne) {
    const canvasPath = getLockedCanvasPath(cached.canvasPaths, scale);

    if (!canvasPath) {
      throw new Error(
        `There is no cached canvas file for canvas ${canvasId} at ${scale}x`,
      );
    }

    const cropX = x0 * scale;
    const cropY = y0 * scale;
    const cropWidth = width * scale;
    const cropHeight = height * scale;

    const fileStream = createReadStream(canvasPath);
    const transformer = sharp()
      .extract({
        left: cropX,
        top: cropY,
        width: cropWidth,
        height: cropHeight,
      })
      .png();

    const output = new PassThrough();

    pipeline(fileStream, transformer, output).catch((error: unknown) => {
      output.destroy(error as Error);
    });

    return output;
  }

  const unlocked = cached;
  const rawBuffer = pixelsToRgbaBuffer(
    unlocked.pixels,
    unlocked.width,
    unlocked.height,
  );

  const source = sharp(rawBuffer, {
    raw: { width: unlocked.width, height: unlocked.height, channels: 4 },
  });

  const cropped = source.extract({ left: x0, top: y0, width, height });
  const resized =
    scale === 1 ? cropped : (
      cropped.resize({
        width: width * scale,
        height: height * scale,
        kernel: sharp.kernel.nearest,
      })
    );

  const transformer = resized.png();
  const output = new PassThrough();

  pipeline(transformer, output).catch((error: unknown) => {
    output.destroy(error as Error);
  });

  return output;
}

export async function createFrameExportPackage(
  frameId: Frame["id"],
): Promise<FrameExportPackage> {
  const frame = await getFrameById(frameId);

  const statistics = await getFrameStatisticsSummary(frameId);

  const leaderboard = await prisma.leaderboard_frame.findMany({
    where: { frame_id: frameId },
    orderBy: { rank: "asc" },
    select: {
      rank: true,
      user_id: true,
      total_pixels: true,
    },
  });

  const colorLeaderboards = await prisma.color_leaderboard_frame.findMany({
    where: { frame_id: frameId },
    orderBy: { rank: "asc" },
    select: {
      rank: true,
      user_id: true,
      color_id: true,
      total_pixels: true,
    },
  });

  const colorLeaderboardsPartitioned = groupBy(
    colorLeaderboards,
    (entry) => entry.color_id,
  );

  const imageExportUrls = CANVAS_EXPORT_SCALES.reduce<
    Record<CanvasExportScale, string>
  >(
    (acc, scale) => {
      acc[scale] = `/api/v1/frames/${frameId}@${scale}.png`;
      return acc;
    },
    {} as Record<CanvasExportScale, string>,
  );
  const timelapseExportUrl = `/api/v1/frames/${frameId}.mp4`;

  return {
    frame,
    statistics: {
      totalPixelsPlaced: statistics.totalPixelsPlaced,
      totalUsersInvolved: statistics.totalUsersInvolved,
    },
    export: {
      imageUrls: imageExportUrls,
      timelapseUrl: timelapseExportUrl,
    },
    lastUpdated: new Date().toISOString(),
    colorDistribution: statistics.colorDistribution,
    leaderboard: {
      all: leaderboard.map((entry) => ({
        rank: entry.rank,
        userId: entry.user_id,
        totalPixels: entry.total_pixels,
      })),
      colors: Object.fromEntries(
        Object.entries(colorLeaderboardsPartitioned).map(
          ([colorId, entries]) => [
            colorId,
            entries.map((entry) => ({
              rank: entry.rank,
              userId: entry.user_id,
              totalPixels: entry.total_pixels,
            })),
          ],
        ),
      ),
    },
  };
}
