import { createReadStream } from "node:fs";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  CANVAS_EXPORT_SCALES,
  type CanvasExportScale,
  type CanvasInfo,
  DEFAULT_CANVAS_EXPORT_SCALE,
  type Frame,
  type PixelColor,
} from "@blurple-canvas-web/types";
import sharp from "sharp";
import type { canvas as PrismaCanvas } from "@/client";
import config from "@/config";
import { BadRequestError } from "@/errors";
import {
  getCanvasFilename,
  getCanvasPng,
  getLockedCanvasPath,
} from "@/services/canvasService";
import { getFrameById } from "./frameService";

export function pixelsToRgbaBuffer(pixels: PixelColor[]): Buffer {
  const buffer = Buffer.alloc(pixels.length * 4);

  pixels.forEach((color, index) => {
    const imageIndex = index * 4;
    buffer[imageIndex] = color[0];
    buffer[imageIndex + 1] = color[1];
    buffer[imageIndex + 2] = color[2];
    buffer[imageIndex + 3] = color[3];
  });

  return buffer;
}

export async function saveCanvasToFileSystem(
  canvas: PrismaCanvas,
  pixels: PixelColor[],
): Promise<Partial<Record<CanvasExportScale, string>>> {
  const rawBuffer = pixelsToRgbaBuffer(pixels);
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
    ...frame,
    scale,
  });
}

export async function exportCanvasBoundsAsStream({
  canvasId,
  x0,
  y0,
  x1,
  y1,
  scale = DEFAULT_CANVAS_EXPORT_SCALE,
}: {
  canvasId: CanvasInfo["id"];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  scale?: CanvasExportScale;
}): Promise<NodeJS.ReadableStream> {
  const width = x1 - x0;
  const height = y1 - y0;

  if (width <= 0 || height <= 0) {
    throw new BadRequestError("Invalid crop dimensions");
  }

  const cached = await getCanvasPng(canvasId);

  if (cached.isLocked) {
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
  const rawBuffer = pixelsToRgbaBuffer(unlocked.pixels);

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

  return resized.png();
}
