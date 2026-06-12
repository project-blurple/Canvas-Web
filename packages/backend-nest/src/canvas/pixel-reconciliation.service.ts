import type { PixelColor, Point } from "@blurple-canvas-web/types";
import { Injectable, Logger } from "@nestjs/common";
import type { History } from "@/common/database/prisma.client";
import { PrismaService } from "@/common/database/prisma.service";
import { NotFoundError } from "@/common/errors/not-found.error";
import { BroadcastService } from "@/realtime/broadcast.service";
import { CanvasCacheService } from "./canvas-cache.service";

export const BLANK_PIXEL_COLOR_ID = 1;

const COORDINATE_CHUNK_SIZE = 500;

export type BulkPlaceEntry = Pick<History, "colorId" | "x" | "y">;

@Injectable()
export class PixelReconciliationService {
  private readonly logger = new Logger(PixelReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly canvasCacheService: CanvasCacheService,
    private readonly broadcastService: BroadcastService,
  ) {}

  async createBulkPlaceEntries({
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
  }): Promise<void> {
    this.logger.log(
      `Creating ${entries.length} history entries for canvas ${canvasId}`,
    );

    const batchSize = 10_000;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      this.logger.log(
        `Inserting batch ${i / batchSize + 1} (${batch.length} entries)`,
      );

      const data = batch.map((entry) => ({
        canvasId,
        userId,
        guildId,
        colorId: entry.colorId,
        x: entry.x,
        y: entry.y,
        timestamp: timestamp ?? new Date(),
      }));
      await this.prisma.history.createMany({
        data,
      });
    }

    await this.restorePixelsAfterHistoryModification(canvasId, entries);
  }

  /**
   * Rebuilds the current pixel state for the given coordinates after bulk
   * history operations: the latest non-erased entry per coordinate wins, an
   * empty history means the blank colour. Coordinates are processed in chunks
   * to avoid hitting query size limits and ensure predictable performance for
   * large erasures.
   */
  async restorePixelsAfterHistoryModification(
    canvasId: number,
    coordinates: Point[],
  ): Promise<void> {
    const uniqueCoordinates = new Map<string, Point>();

    for (const coordinate of coordinates) {
      uniqueCoordinates.set(`${coordinate.x}:${coordinate.y}`, coordinate);
    }

    const blankColor = (await this.prisma.color.findUnique({
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
      Pick<History, "x" | "y" | "colorId" | "timestamp" | "id"> & {
        color: { rgba: PixelColor };
      }
    >();

    for (const chunk of chunks) {
      const historyEntries = await this.prisma.history.findMany({
        where: {
          erasedAt: null,
          canvasId,
          OR: chunk.map((coordinate) => ({
            x: coordinate.x,
            y: coordinate.y,
          })),
        },
        select: {
          x: true,
          y: true,
          colorId: true,
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

      // Group coordinates by colour ID for batch updates
      const byColorId = new Map<number, Point[]>();
      for (const coordinate of chunk) {
        const key = `${coordinate.x}:${coordinate.y}`;
        const latestEntry = latestByCoord.get(key);
        const colorId = latestEntry?.colorId ?? BLANK_PIXEL_COLOR_ID;

        const arr = byColorId.get(colorId);
        if (arr) {
          arr.push(coordinate);
        } else {
          byColorId.set(colorId, [coordinate]);
        }
      }

      for (const [colorId, coords] of byColorId.entries()) {
        await this.prisma.pixel.updateMany({
          where: {
            canvasId,
            OR: coords.map((coordinate) => ({
              x: coordinate.x,
              y: coordinate.y,
            })),
          },
          data: { colorId },
        });
      }
    }

    // Build bulk payload and update cache per-pixel
    const pixels: { x: number; y: number; rgba: PixelColor }[] = [];
    for (const coordinate of uniqueCoordinates.values()) {
      const key = `${coordinate.x}:${coordinate.y}`;
      const latestEntry = latestByCoord.get(key);
      const pixelColor = latestEntry?.color.rgba ?? blankColor.rgba;

      pixels.push({ x: coordinate.x, y: coordinate.y, rgba: pixelColor });

      this.canvasCacheService.updateCachedCanvasPixel(
        canvasId,
        coordinate,
        pixelColor,
      );
    }

    if (pixels.length > 0) {
      this.broadcastService.broadcastPixelsBulk(canvasId, { pixels });
    }
  }
}
