import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import sharp from "sharp";

import type {
  SnapshotCursor,
  SnapshotManifest,
} from "@/common/database/snapshot/snapshot-prisma.client";
import { SnapshotPrismaService } from "@/common/database/snapshot/snapshot-prisma.service";
import type { SnapshotConfig } from "@/config/snapshot.config";
import { snapshotConfig } from "@/config/snapshot.config";
import { getSnapshotImagePath } from "./snapshot-paths";

export interface FindManifestsParams {
  canvasId: number;
  from?: Date;
  to?: Date;
}

export interface UpsertManifestParams {
  canvasId: number;
  snapshotAt: Date;
  image: Buffer;
  historyCount: number;
  lastIncludedHistoryAt: Date;
}

export interface WrittenSnapshotImage {
  filePath: string;
  fileSizeBytes: number;
}

@Injectable()
export class SnapshotStoreService {
  constructor(
    private readonly snapshotPrisma: SnapshotPrismaService,
    @Inject(snapshotConfig.KEY) private readonly config: SnapshotConfig,
  ) {}

  async findManifests({
    canvasId,
    from,
    to,
  }: FindManifestsParams): Promise<SnapshotManifest[]> {
    const where =
      from || to ?
        {
          canvasId,
          lastIncludedHistoryAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : { canvasId };

    const manifests = await this.snapshotPrisma.snapshotManifest.findMany({
      where,
      orderBy: { lastIncludedHistoryAt: "desc" },
    });

    if (to) {
      const extra = await this.snapshotPrisma.snapshotManifest.findFirst({
        where: {
          canvasId,
          lastIncludedHistoryAt: { gt: to },
        },
        orderBy: { lastIncludedHistoryAt: "asc" },
      });

      if (extra && !manifests.some((manifest) => manifest.id === extra.id)) {
        manifests.unshift(extra);
      }
    }

    return manifests;
  }

  async findLatestManifestBefore(
    canvasId: number,
    before: Date,
  ): Promise<SnapshotManifest | null> {
    return this.snapshotPrisma.snapshotManifest.findFirst({
      where: {
        canvasId,
        snapshotAt: { lt: before },
      },
      orderBy: [{ snapshotAt: "desc" }, { id: "desc" }],
    });
  }

  async readManifestRawBuffer(
    imagePath: string,
    canvasId: number,
    width: number,
    height: number,
  ): Promise<Buffer> {
    const snapshotImage = await readFile(imagePath);
    const { data } = await sharp(snapshotImage)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const expectedLength = width * height * 4;
    if (data.length !== expectedLength) {
      throw new Error(
        `Snapshot image for canvas ${canvasId} has invalid dimensions: expected ${width}x${height}, got ${data.length / 4} pixels`,
      );
    }

    return data;
  }

  async writeSnapshotImage(
    canvasId: number,
    snapshotAt: Date,
    image: Buffer,
  ): Promise<WrittenSnapshotImage> {
    const filePath = getSnapshotImagePath(
      this.config.imageRoot,
      canvasId,
      snapshotAt,
    );

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, image);

    return { filePath, fileSizeBytes: image.length };
  }

  async upsertManifest({
    canvasId,
    snapshotAt,
    image,
    historyCount,
    lastIncludedHistoryAt,
  }: UpsertManifestParams): Promise<void> {
    const { filePath, fileSizeBytes } = await this.writeSnapshotImage(
      canvasId,
      snapshotAt,
      image,
    );

    await this.snapshotPrisma.snapshotManifest.upsert({
      where: {
        canvasId_snapshotAt: {
          canvasId,
          snapshotAt,
        },
      },
      create: {
        canvasId,
        snapshotAt,
        historyCount,
        imagePath: filePath,
        lastIncludedHistoryAt,
        fileSizeBytes,
      },
      update: {
        historyCount,
        imagePath: filePath,
        lastIncludedHistoryAt,
        fileSizeBytes,
      },
    });
  }

  async ensureCursors(
    canvasIds: number[],
  ): Promise<Map<number, SnapshotCursor>> {
    const cursors = await this.snapshotPrisma.snapshotCursor.findMany({
      where: { canvasId: { in: canvasIds } },
    });

    const cursorByCanvas = new Map<number, SnapshotCursor>();
    for (const cursor of cursors) {
      cursorByCanvas.set(cursor.canvasId, cursor);
    }

    for (const canvasId of canvasIds) {
      if (!cursorByCanvas.has(canvasId)) {
        const newCursor = await this.snapshotPrisma.snapshotCursor.create({
          data: {
            canvasId,
            lastProcessedTimestamp: new Date(0),
            dirtyFromTimestamp: null,
          },
        });
        cursorByCanvas.set(canvasId, newCursor);
      }
    }

    return cursorByCanvas;
  }

  async advanceCursor(canvasId: number, snapshotAt: Date): Promise<void> {
    await this.snapshotPrisma.$transaction([
      this.snapshotPrisma.snapshotCursor.update({
        where: { canvasId },
        data: { lastProcessedTimestamp: snapshotAt },
      }),
      this.snapshotPrisma.snapshotCursor.updateMany({
        where: {
          canvasId,
          dirtyFromTimestamp: { lte: snapshotAt },
        },
        data: { dirtyFromTimestamp: null },
      }),
    ]);
  }

  async markDirty(canvasId: number, timestamp: Date): Promise<void> {
    await this.snapshotPrisma.snapshotCursor.upsert({
      where: { canvasId },
      create: {
        canvasId,
        dirtyFromTimestamp: timestamp,
        lastProcessedTimestamp: new Date(0),
      },
      update: {},
    });

    await this.snapshotPrisma.snapshotCursor.updateMany({
      where: {
        canvasId,
        OR: [
          { dirtyFromTimestamp: { gt: timestamp } },
          { dirtyFromTimestamp: null },
        ],
      },
      data: {
        dirtyFromTimestamp: timestamp,
      },
    });
  }
}
