import { createHash } from "node:crypto";
import { copyFile, mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Inject, Injectable, Logger } from "@nestjs/common";

import type { TimelapseManifest } from "@/common/database/snapshot/snapshot-prisma.client";
import { SnapshotPrismaService } from "@/common/database/snapshot/snapshot-prisma.service";
import type { TimelapseConfig } from "@/config/timelapse.config";
import { timelapseConfig } from "@/config/timelapse.config";
import { getTimelapseVideoFormat } from "./timelapse.constants";
import type { TimelapseCacheParams } from "./timelapse.types";
import { getTimelapseVideoPath } from "./timelapse-paths";

@Injectable()
export class TimelapseStoreService {
  private readonly logger = new Logger(TimelapseStoreService.name);

  constructor(
    private readonly snapshotPrisma: SnapshotPrismaService,
    @Inject(timelapseConfig.KEY) private readonly config: TimelapseConfig,
  ) {}

  buildCacheKey(params: TimelapseCacheParams): string {
    return createHash("sha256")
      .update(
        JSON.stringify({
          canvasId: params.canvasId,
          effectiveStartAt: params.effectiveStartAt.toISOString(),
          effectiveEndAt: params.effectiveEndAt.toISOString(),
          bounds:
            params.cropBounds ?
              {
                x0: params.cropBounds.x0,
                y0: params.cropBounds.y0,
                x1: params.cropBounds.x1,
                y1: params.cropBounds.y1,
              }
            : null,
          frameRate: params.frameRate,
          endHoldDurationMs: params.endHoldDurationMs,
          showEndCard: params.showEndCard,
          scale: params.scale,
          backgroundColor: params.backgroundColor,
          raw: params.raw,
        }),
      )
      .digest("hex");
  }

  private getFilePath(params: TimelapseCacheParams, cacheKey: string): string {
    const format = getTimelapseVideoFormat(params.raw);
    return getTimelapseVideoPath(
      this.config.videoRoot,
      params.canvasId,
      `${cacheKey}.${format}`,
    );
  }

  async findCachedEntry(cacheKey: string): Promise<TimelapseManifest | null> {
    const manifest = await this.snapshotPrisma.timelapseManifest.findUnique({
      where: { cacheKey },
    });

    if (!manifest || manifest.invalidatedAt !== null) {
      return null;
    }

    const fileExists = await stat(manifest.filePath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      return null;
    }

    await this.snapshotPrisma.timelapseManifest
      .update({
        where: { cacheKey },
        data: { accessedAt: new Date() },
      })
      .catch(() => undefined);

    return manifest;
  }

  async writeAndUpsert(
    params: TimelapseCacheParams,
    cacheKey: string,
    sourcePath: string,
  ): Promise<string> {
    const finalPath = this.getFilePath(params, cacheKey);
    await mkdir(path.dirname(finalPath), { recursive: true });

    // Atomic write via rename. Falls back to copyFile + unlink across filesystems (EXDEV).
    const tempPath = `${finalPath}.tmp-${process.pid}-${Date.now()}`;
    await this.moveFile(sourcePath, tempPath);

    try {
      await unlink(finalPath).catch(() => undefined);
      await rename(tempPath, finalPath);
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    }

    const fileStats = await stat(finalPath);

    await this.snapshotPrisma.timelapseManifest.upsert({
      where: { cacheKey },
      create: {
        canvasId: params.canvasId,
        requestedStartAt: params.requestedStartAt ?? null,
        requestedEndAt: params.requestedEndAt ?? null,
        effectiveStartAt: params.effectiveStartAt,
        effectiveEndAt: params.effectiveEndAt,
        boundsX0: params.cropBounds?.x0 ?? null,
        boundsY0: params.cropBounds?.y0 ?? null,
        boundsX1: params.cropBounds?.x1 ?? null,
        boundsY1: params.cropBounds?.y1 ?? null,
        scale: params.scale,
        frameRate: params.frameRate,
        endHoldDurationMs: params.endHoldDurationMs ?? 0,
        showEndCard: params.showEndCard,
        backgroundColor: JSON.stringify(params.backgroundColor),
        cacheKey,
        filePath: finalPath,
        fileSizeBytes: fileStats.size,
        invalidatedAt: null,
        accessedAt: new Date(),
      },
      update: {
        requestedStartAt: params.requestedStartAt ?? null,
        requestedEndAt: params.requestedEndAt ?? null,
        effectiveStartAt: params.effectiveStartAt,
        effectiveEndAt: params.effectiveEndAt,
        boundsX0: params.cropBounds?.x0 ?? null,
        boundsY0: params.cropBounds?.y0 ?? null,
        boundsX1: params.cropBounds?.x1 ?? null,
        boundsY1: params.cropBounds?.y1 ?? null,
        scale: params.scale,
        frameRate: params.frameRate,
        endHoldDurationMs: params.endHoldDurationMs ?? 0,
        showEndCard: params.showEndCard,
        backgroundColor: JSON.stringify(params.backgroundColor),
        filePath: finalPath,
        fileSizeBytes: fileStats.size,
        invalidatedAt: null,
        accessedAt: new Date(),
      },
    });

    return finalPath;
  }

  async invalidateFrom(canvasId: number, timestamp: Date): Promise<void> {
    const result = await this.snapshotPrisma.timelapseManifest.updateMany({
      where: {
        canvasId,
        effectiveEndAt: { gte: timestamp },
        invalidatedAt: null,
      },
      data: { invalidatedAt: new Date() },
    });

    if (result.count > 0) {
      this.logger.log(
        `Invalidated ${result.count} timelapse manifest(s) for canvas ${canvasId}`,
      );
    }
  }

  async evictStaleInvalidated(ttlMs: number): Promise<number> {
    const staleThreshold = new Date(Date.now() - ttlMs);

    const staleManifests = await this.snapshotPrisma.timelapseManifest.findMany(
      {
        where: { invalidatedAt: { lt: staleThreshold } },
        select: { id: true, filePath: true },
      },
    );

    if (staleManifests.length === 0) {
      return 0;
    }

    for (const manifest of staleManifests) {
      await unlink(manifest.filePath).catch(() => undefined);
    }

    await this.snapshotPrisma.timelapseManifest.deleteMany({
      where: { id: { in: staleManifests.map((m) => m.id) } },
    });

    this.logger.log(
      `Evicted ${staleManifests.length} stale invalidated timelapse(s)`,
    );
    return staleManifests.length;
  }

  private async moveFile(src: string, dest: string): Promise<void> {
    try {
      await rename(src, dest);
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "EXDEV") {
        await copyFile(src, dest);
        await unlink(src);
        return;
      }
      throw error;
    }
  }
}
