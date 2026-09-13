import type { PixelColor } from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";
import sharp from "sharp";

import { BLANK_PIXEL_COLOR_ID } from "@/common/constants";
import { PrismaService } from "@/common/database/core/prisma.service";
import { NotFoundError } from "@/common/errors/not-found.error";
import { SnapshotStoreService } from "./snapshot-store.service";

export interface BuildSnapshotParams {
  canvasId: number;
  before: Date;
}

export interface BuiltSnapshot {
  image: Buffer;
  lastIncludedHistoryAt: Date;
}

interface LatestHistoryEntry {
  x: number;
  y: number;
  timestamp: Date;
  rgba: PixelColor;
}

/**
 * Builds a canvas snapshot image for a point in time by replaying the history
 * recorded since the previous snapshot onto that snapshot (or a blank canvas
 * when none exists). Snapshots are stored as lossless WebP.
 */
@Injectable()
export class SnapshotGeneratorService {
  private blankPixelRgba: PixelColor | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotStore: SnapshotStoreService,
  ) {}

  async buildSnapshot({
    canvasId,
    before,
  }: BuildSnapshotParams): Promise<BuiltSnapshot> {
    const canvas = await this.getCanvasDimensions(canvasId);
    const latestSnapshot = await this.snapshotStore.findLatestManifestBefore(
      canvasId,
      before,
    );

    const from = latestSnapshot?.snapshotAt ?? new Date(0);
    const historyEntries = await this.getLatestHistoryEntriesInRange(
      canvasId,
      from,
      before,
    );

    const lastIncludedHistoryAt =
      historyEntries.length > 0 ?
        new Date(
          Math.max(...historyEntries.map((entry) => entry.timestamp.getTime())),
        )
      : from;

    const rawBuffer =
      latestSnapshot ?
        await this.snapshotStore.readManifestRawBuffer(
          latestSnapshot.imagePath,
          canvasId,
          canvas.width,
          canvas.height,
        )
      : await this.createBlankBuffer(canvas.width, canvas.height);

    for (const entry of historyEntries) {
      this.applyEntryToBuffer(rawBuffer, canvas.width, entry);
    }

    const image = await sharp(rawBuffer, {
      raw: {
        width: canvas.width,
        height: canvas.height,
        channels: 4,
      },
    })
      .webp({ lossless: true })
      .toBuffer();

    return { image, lastIncludedHistoryAt };
  }

  private async getCanvasDimensions(
    canvasId: number,
  ): Promise<{ width: number; height: number }> {
    const canvas = await this.prisma.canvas.findFirst({
      where: { id: canvasId },
      select: { width: true, height: true },
    });

    if (!canvas) {
      throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
    }

    return canvas;
  }

  private async getBlankPixelRgba(): Promise<PixelColor> {
    if (this.blankPixelRgba) {
      return this.blankPixelRgba;
    }

    const blankColor = await this.prisma.color.findUnique({
      where: { id: BLANK_PIXEL_COLOR_ID },
      select: { rgba: true },
    });

    if (!blankColor) {
      throw new NotFoundError(
        `There is no color with ID ${BLANK_PIXEL_COLOR_ID}`,
      );
    }

    this.blankPixelRgba = blankColor.rgba as PixelColor;
    return this.blankPixelRgba;
  }

  /**
   * Latest history entry per coordinate within the `[from, to)` range. The
   * half-open interval keeps adjacent snapshot windows from overlapping.
   */
  private async getLatestHistoryEntriesInRange(
    canvasId: number,
    from: Date,
    to: Date,
  ): Promise<LatestHistoryEntry[]> {
    if (to <= from) {
      throw new Error("to must be after from");
    }

    const rows = await this.prisma.$kysely
      .selectFrom("history")
      .innerJoin("color", "color.id", "history.colorId")
      .select([
        "history.x",
        "history.y",
        "history.timestamp",
        "color.rgba as rgba",
      ])
      .distinctOn(["history.x", "history.y"])
      .where("history.canvasId", "=", canvasId)
      .where("history.erasedAt", "is", null)
      .where("history.timestamp", ">=", from)
      .where("history.timestamp", "<", to)
      .orderBy("history.x", "asc")
      .orderBy("history.y", "asc")
      .orderBy("history.timestamp", "desc")
      .orderBy("history.id", "desc")
      .execute();

    return rows.map((row) => ({
      x: row.x,
      y: row.y,
      timestamp: row.timestamp,
      rgba: row.rgba as PixelColor,
    }));
  }

  private async createBlankBuffer(
    width: number,
    height: number,
  ): Promise<Buffer> {
    const blankPixel = await this.getBlankPixelRgba();
    const buffer = Buffer.alloc(width * height * 4);

    for (let index = 0; index < buffer.length; index += 4) {
      buffer[index] = blankPixel[0];
      buffer[index + 1] = blankPixel[1];
      buffer[index + 2] = blankPixel[2];
      buffer[index + 3] = blankPixel[3];
    }

    return buffer;
  }

  private applyEntryToBuffer(
    buffer: Buffer,
    width: number,
    entry: LatestHistoryEntry,
  ): void {
    const index = (entry.y * width + entry.x) * 4;
    const [red = 0, green = 0, blue = 0, alpha = 0] = entry.rgba;

    buffer[index] = red;
    buffer[index + 1] = green;
    buffer[index + 2] = blue;
    buffer[index + 3] = alpha;
  }
}
