import { createReadStream } from "node:fs";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  boundsWithDimensions,
  type CanvasExportScale,
  type CanvasInfo,
  DEFAULT_CANVAS_EXPORT_SCALE,
} from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";
import sharp from "sharp";

import { BadRequestError } from "@/common/errors/bad-request.error";
import {
  CanvasCacheService,
  type UnlockedCanvas,
} from "./canvas-cache.service";

@Injectable()
export class ExportService {
  constructor(private readonly canvasCacheService: CanvasCacheService) {}

  /**
   * Streams an unlocked canvas as a PNG, resized with nearest-neighbour when
   * a scale above 1× is requested.
   */
  unlockedCanvasToPngStream(
    unlockedCanvas: UnlockedCanvas,
    scale: CanvasExportScale = DEFAULT_CANVAS_EXPORT_SCALE,
  ): NodeJS.ReadableStream {
    const rawBuffer = this.canvasCacheService.pixelsToRgbaBuffer(
      unlockedCanvas.pixels,
      unlockedCanvas.width,
      unlockedCanvas.height,
    );

    const image = sharp(rawBuffer, {
      raw: {
        width: unlockedCanvas.width,
        height: unlockedCanvas.height,
        channels: 4,
      },
    });

    const resized =
      scale === 1 ? image : (
        image.resize({
          width: unlockedCanvas.width * scale,
          height: unlockedCanvas.height * scale,
          kernel: sharp.kernel.nearest,
        })
      );

    return CanvasCacheService.withPngMetadata(resized, scale).png();
  }

  /**
   * Streams a cropped region of a canvas as a PNG. Locked canvases are
   * extracted from the materialised file at the requested scale; unlocked
   * canvases are cropped from the in-memory pixel buffer and resized with
   * nearest-neighbour.
   */
  async exportCanvasBoundsAsStream({
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
    // Bounds are inclusive, so a 1px crop has x0 === x1.
    const { width, height } = boundsWithDimensions({ x0, y0, x1, y1 });

    if (width <= 0 || height <= 0) {
      throw new BadRequestError("Invalid crop dimensions");
    }

    const cached = await this.canvasCacheService.getCanvasPng(canvasId);

    if (cached.isLocked) {
      const canvasPath = cached.canvasPaths[scale];

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
      const transformer = CanvasCacheService.withPngMetadata(
        sharp().extract({
          left: cropX,
          top: cropY,
          width: cropWidth,
          height: cropHeight,
        }),
        scale,
      ).png();

      const output = new PassThrough();

      pipeline(fileStream, transformer, output).catch((error: unknown) => {
        output.destroy(error as Error);
      });

      return output;
    }

    const unlocked = cached;
    const rawBuffer = this.canvasCacheService.pixelsToRgbaBuffer(
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

    const transformer = CanvasCacheService.withPngMetadata(
      resized,
      scale,
    ).png();
    const output = new PassThrough();

    pipeline(transformer, output).catch((error: unknown) => {
      output.destroy(error as Error);
    });

    return output;
  }
}
