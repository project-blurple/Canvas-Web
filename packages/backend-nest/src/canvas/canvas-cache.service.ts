import fs from "node:fs";
import {
  type BoundsInput,
  CANVAS_EXPORT_SCALES,
  type CanvasExportScale,
  type CanvasInfo,
  CanvasPlaceState,
  DEFAULT_CANVAS_EXPORT_SCALE,
  type PixelColor,
  type PlacePixelArray,
  type Point,
} from "@blurple-canvas-web/types";
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from "@nestjs/common";
import sharp from "sharp";

import { PrismaService } from "@/common/database/prisma.service";
import { NotFoundError } from "@/common/errors/not-found.error";
import { type AppConfig, appConfig } from "@/config/app.config";

/**
 * A locked canvas cannot be edited by users. It is therefore, safe to store it
 * as an image on the file system.
 */
export interface LockedCanvas {
  placeState: typeof CanvasPlaceState.NoOne;
  canvasPaths: Partial<Record<CanvasExportScale, string>>;
}

/**
 * An unlocked canvas can be edited by users so the pixels are stored in
 * memory. This allows for easy updating of the canvas, while also allowing it
 * to be rapidly returned from requests (as most of the time to build a canvas
 * image from scratch is fetching the pixels from the database).
 */
export interface UnlockedCanvas {
  placeState:
    | typeof CanvasPlaceState.Anyone
    | typeof CanvasPlaceState.NoNewUsers;
  width: number;
  height: number;
  pixels: PixelColor[];
}

export type CachedCanvas = LockedCanvas | UnlockedCanvas;

@Injectable()
export class CanvasCacheService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CanvasCacheService.name);

  private readonly canvasCache = new Map<number, CachedCanvas>();
  private readonly canvasLoads = new Map<number, Promise<CachedCanvas>>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(appConfig.KEY) private readonly appCfg: AppConfig,
  ) {}

  onApplicationBootstrap(): void {
    this.initializeCache();
  }

  static withPngMetadata(
    image: sharp.Sharp,
    scale: CanvasExportScale,
  ): sharp.Sharp {
    return image.withMetadata({ density: 72 * scale }).withIccProfile("srgb");
  }

  /**
   * Generates a filename for a canvas image. If the canvas is not locked (and
   * therefore, can change) the filename will include the current timestamp.
   */
  getCanvasFilename(
    canvasId: number,
    isLocked = false,
    scale: CanvasExportScale = DEFAULT_CANVAS_EXPORT_SCALE,
    bounds?: BoundsInput,
  ): string {
    const scaleSuffix = scale === 1 ? "" : `@${scale}x`;
    const boundsSuffix =
      bounds ? `_${bounds.x0}x${bounds.y0}_${bounds.x1}x${bounds.y1}` : "";

    return `blurple-canvas__${canvasId}__${isLocked ? "locked" : Date.now()}${boundsSuffix}${scaleSuffix}.png`;
  }

  pixelsToRgbaBuffer(
    pixels: PixelColor[],
    width: number,
    height: number,
  ): Buffer {
    const expectedPixelCount = width * height;
    const buffer = Buffer.alloc(expectedPixelCount * 4);

    if (pixels.length !== expectedPixelCount) {
      this.logger.warn(
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

  /**
   * Warms the locked-canvas cache from the PNG files already present in the
   * canvases directory.
   */
  initializeCache(): void {
    const lockedCanvasPaths = new Map<number, LockedCanvas["canvasPaths"]>();

    for (const filename of fs.readdirSync(this.appCfg.paths.canvases)) {
      const match = new RegExp(
        /^blurple-canvas__(\d+)__locked(?:@(\d+)x)?\.png$/,
      ).exec(filename);

      if (!match) {
        continue;
      }

      const canvasId = Number.parseInt(match[1], 10);
      const scale = (
        match[2] ?
          Number.parseInt(match[2], 10)
        : 1) as CanvasExportScale;
      const canvasPath = `${this.appCfg.paths.canvases}/${filename}`;

      this.logger.log(`Loaded cached canvas ${canvasPath}`);

      const canvasPaths = lockedCanvasPaths.get(canvasId) ?? {};
      canvasPaths[scale] = canvasPath;
      lockedCanvasPaths.set(canvasId, canvasPaths);
    }

    for (const [canvasId, canvasPaths] of lockedCanvasPaths) {
      const canvasPath = canvasPaths[1];

      if (!canvasPath) {
        continue;
      }

      this.canvasCache.set(canvasId, {
        placeState: CanvasPlaceState.NoOne,
        canvasPaths,
      });
    }
  }

  /**
   * Retrieves a canvas from the cache. If the canvas is not in the cache it
   * will be fetched from the database and added to it.
   */
  async getCanvasPng(canvasId: number): Promise<CachedCanvas> {
    return this.getOrFetchCachedCanvas(canvasId);
  }

  /**
   * Clears a canvas from the in-memory cache. If the canvas is locked, the
   * cached image is also removed from the file system.
   */
  async clearCachedCanvas(canvasId: number): Promise<void> {
    await this.clearCanvasFromFileSystem(canvasId);
    this.canvasCache.delete(canvasId);
    this.logger.debug(`Cleared canvas ${canvasId} from cache`);
  }

  /**
   * Updates many pixels in the canvas cache at once. If the canvas is not in
   * the cache or the canvas is locked this will do nothing.
   */
  updateManyCachedPixels(canvasId: number, pixels: PlacePixelArray): void {
    const cachedCanvas = this.canvasCache.get(canvasId);

    if (!cachedCanvas || cachedCanvas.placeState === CanvasPlaceState.NoOne) {
      return;
    }

    for (const pixel of pixels) {
      const pixelIndex = pixel.y * cachedCanvas.width + pixel.x;
      cachedCanvas.pixels[pixelIndex] = pixel.rgba;
    }
  }

  /**
   * Updates a pixel in the canvas cache. If the canvas is not in the cache,
   * or the canvas is locked this will do nothing.
   */
  updateCachedCanvasPixel(
    canvasId: CanvasInfo["id"],
    coordinates: Point,
    color: PixelColor,
  ): void {
    const cachedCanvas = this.canvasCache.get(canvasId);

    if (!cachedCanvas || cachedCanvas.placeState === CanvasPlaceState.NoOne) {
      return;
    }

    const pixelIndex = coordinates.y * cachedCanvas.width + coordinates.x;
    cachedCanvas.pixels[pixelIndex] = color;
  }

  async getCanvasPixels(
    canvasId: number,
    width: number,
    height: number,
  ): Promise<PixelColor[]> {
    const pixels = (await this.prisma.pixel.findMany({
      select: {
        x: true,
        y: true,
        color: {
          select: { rgba: true },
        },
      },
      where: { canvasId },
    })) as { x: number; y: number; color: { rgba: PixelColor } }[];

    const flat: PixelColor[] = new Array(width * height);
    for (const pixel of pixels) {
      flat[pixel.y * width + pixel.x] = pixel.color.rgba;
    }
    return flat;
  }

  /**
   * Materialises a canvas as PNG files at every export scale and returns the
   * paths keyed by scale.
   */
  private async saveCanvasToFileSystem(
    canvas: { id: number; width: number; height: number },
    pixels: PixelColor[],
  ): Promise<LockedCanvas["canvasPaths"]> {
    const rawBuffer = this.pixelsToRgbaBuffer(
      pixels,
      canvas.width,
      canvas.height,
    );
    const baseImage = sharp(rawBuffer, {
      raw: {
        width: canvas.width,
        height: canvas.height,
        channels: 4,
      },
    });

    const files = await Promise.all(
      CANVAS_EXPORT_SCALES.map(async (scale) => {
        const path = `${this.appCfg.paths.canvases}/${this.getCanvasFilename(canvas.id, true, scale)}`;

        await CanvasCacheService.withPngMetadata(
          baseImage.clone().resize({
            width: canvas.width * scale,
            height: canvas.height * scale,
            kernel: sharp.kernel.nearest,
          }),
          scale,
        )
          .png()
          .toFile(path);

        return [scale, path] as const;
      }),
    );

    return Object.fromEntries(files) as LockedCanvas["canvasPaths"];
  }

  private async clearCanvasFromFileSystem(canvasId: number): Promise<void> {
    const cachedCanvas = this.canvasCache.get(canvasId);

    try {
      if (cachedCanvas?.placeState === CanvasPlaceState.NoOne) {
        const uniquePaths = new Set(Object.values(cachedCanvas.canvasPaths));

        await Promise.all(
          [...uniquePaths].map(async (canvasPath) => {
            await fs.promises.rm(canvasPath, { force: true });
          }),
        );

        this.logger.debug(`Cleared canvas ${canvasId} from file system`);
      }
    } catch {
      this.logger.warn(
        `Failed to clear canvas ${canvasId} from file system. It may have already been removed.`,
      );
    }
  }

  private async getOrFetchCachedCanvas(
    canvasId: number,
  ): Promise<CachedCanvas> {
    const inFlightLoad = this.canvasLoads.get(canvasId);
    if (inFlightLoad) {
      return inFlightLoad;
    }

    const loadPromise = this.loadCanvas(canvasId);
    this.canvasLoads.set(canvasId, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.canvasLoads.delete(canvasId);
    }
  }

  private async loadCanvas(canvasId: number): Promise<CachedCanvas> {
    const canvas = await this.prisma.canvas.findFirst({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
    }

    const cachedCanvas = this.canvasCache.get(canvasId);
    if (cachedCanvas) {
      if (cachedCanvas.placeState === canvas.placeState) {
        this.logger.debug(`Cache hit for canvas ${canvasId}`);

        // If this is a locked canvas, verify the cache is complete. If any
        // expected export scale is missing, clear the cache and treat as a
        // miss so we generate all sizes atomically via
        // `saveCanvasToFileSystem` below.
        if (cachedCanvas.placeState === CanvasPlaceState.NoOne) {
          const missing = CANVAS_EXPORT_SCALES.some(
            (scale) => !cachedCanvas.canvasPaths[scale],
          );

          if (missing) {
            this.logger.debug(
              `Cached locked canvas ${canvasId} is incomplete; clearing to regenerate all sizes.`,
            );
            await this.clearCanvasFromFileSystem(canvasId);
            this.canvasCache.delete(canvasId);
          } else {
            return cachedCanvas;
          }
        } else {
          return cachedCanvas;
        }
      } else {
        this.logger.debug(
          `Canvas ${canvasId} lock status has changed. Updating cache…`,
        );
        // Ensure on-disk files are removed and cache entry cleared so we
        // regenerate below
        await this.clearCanvasFromFileSystem(canvasId);
        this.canvasCache.delete(canvasId);
      }
    } else {
      this.logger.debug(`Cache miss for canvas ${canvasId}`);
    }

    const pixels = await this.getCanvasPixels(
      canvasId,
      canvas.width,
      canvas.height,
    );
    const unlockedCanvas: UnlockedCanvas = {
      placeState: CanvasPlaceState.Anyone,
      width: canvas.width,
      height: canvas.height,
      pixels,
    };

    if (canvas.placeState === CanvasPlaceState.NoOne) {
      const canvasPaths = await this.saveCanvasToFileSystem(canvas, pixels);
      const canvasPath = canvasPaths[1];

      if (!canvasPath) {
        throw new Error(
          `Failed to create locked canvas files for canvas ${canvasId}`,
        );
      }

      this.canvasCache.set(canvasId, {
        placeState: canvas.placeState,
        canvasPaths,
      });

      this.logger.debug(`Canvas ${canvasId} saved to ${canvasPath}`);
    } else {
      this.canvasCache.set(canvasId, unlockedCanvas);
      this.logger.debug(`Canvas ${canvasId} cached in memory`);
    }

    // We always want to return the unlocked canvas, even if the image is
    // locked as sometimes the image hasn’t finished being written to the file
    // system when Express tries to send it in the response.
    return unlockedCanvas;
  }
}
