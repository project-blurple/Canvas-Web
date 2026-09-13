import { unlink } from "node:fs/promises";
import type { CanvasExportScale, CanvasInfo } from "@blurple-canvas-web/types";
import { Inject, Injectable } from "@nestjs/common";

import { CanvasService } from "@/canvas/canvas.service";
import { BadRequestError } from "@/common/errors/bad-request.error";
import { NotFoundError } from "@/common/errors/not-found.error";
import { TooManyRequestsError } from "@/common/errors/too-many-requests.error";
import type { TimelapseConfig } from "@/config/timelapse.config";
import { timelapseConfig } from "@/config/timelapse.config";
import { SnapshotService } from "@/snapshot/snapshot.service";
import { NOT_QUITE_BLACK_RGBA } from "./timelapse.constants";
import type {
  Bounds,
  GenerateTimelapseParams,
  TimelapseCacheParams,
} from "./timelapse.types";
import {
  getTimelapseVideoDimensions,
  TimelapseEncoderService,
} from "./timelapse-encoder.service";
import { TimelapseEndCardService } from "./timelapse-end-card.service";
import { TimelapseStoreService } from "./timelapse-store.service";

@Injectable()
export class TimelapseService {
  private readonly inFlight = new Map<string, Promise<string>>();
  private activeConcurrentEncodes = 0;

  constructor(
    private readonly canvasService: CanvasService,
    private readonly snapshotService: SnapshotService,
    private readonly store: TimelapseStoreService,
    private readonly encoder: TimelapseEncoderService,
    private readonly endCard: TimelapseEndCardService,
    @Inject(timelapseConfig.KEY) private readonly config: TimelapseConfig,
  ) {}

  async generateTimelapse({
    canvasId,
    start,
    end,
    bounds,
    frameRate = this.config.defaultFrameRate,
    endHoldDurationMs = this.config.defaultEndHoldDurationMs,
    showEndCard = true,
    scale,
    backgroundColor = NOT_QUITE_BLACK_RGBA,
    raw = "default",
  }: GenerateTimelapseParams): Promise<string> {
    if (raw === "raw") {
      endHoldDurationMs = null;
      scale = 1;
      showEndCard = false;
    }

    if (!Number.isFinite(frameRate) || frameRate <= 0) {
      throw new BadRequestError("frameRate must be a positive number");
    }

    if (!this.snapshotService.isAvailableForCanvas(canvasId)) {
      throw new BadRequestError(
        "Snapshots are not available for this canvas. Timelapse generation requires snapshots.",
      );
    }

    const snapshots = await this.snapshotService.getSnapshots({
      canvasId,
      from: start,
      to: end,
    });

    if (snapshots.length === 0) {
      throw new NotFoundError(
        `No snapshots found for canvas ${canvasId}. Wait for snapshots to be generated before requesting a timelapse.`,
      );
    }

    const ordered = [...snapshots].sort(
      (a, b) => a.snapshotAt.getTime() - b.snapshotAt.getTime(),
    );

    const imagePaths = ordered.map((s) => s.imagePath);

    // biome-ignore lint/style/noNonNullAssertion: length > 0 guaranteed above
    const effectiveStartAt = ordered[0]!.snapshotAt;
    // biome-ignore lint/style/noNonNullAssertion: length > 0 guaranteed above
    const effectiveEndAt = ordered.at(-1)!.snapshotAt;

    const canvas = await this.canvasService.getCanvasInfo(canvasId);
    const cropBounds = this.resolveCropBounds(bounds, canvas);
    const resolvedScale = scale ?? this.calculateScale(canvas, cropBounds);

    const cacheParams: TimelapseCacheParams = {
      canvasId,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      requestedStartAt: start,
      requestedEndAt: end,
      effectiveStartAt,
      effectiveEndAt,
      cropBounds,
      frameRate,
      endHoldDurationMs,
      showEndCard,
      scale: resolvedScale,
      backgroundColor,
      raw,
    };

    return this.getOrCreateFromCache(cacheParams, imagePaths);
  }

  private async getOrCreateFromCache(
    cacheParams: TimelapseCacheParams,
    imagePaths: string[],
  ): Promise<string> {
    const cacheKey = this.store.buildCacheKey(cacheParams);

    const cached = await this.store.findCachedEntry(cacheKey);
    if (cached) {
      return cached.filePath;
    }

    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const promise = this.encodeAndStore(cacheParams, cacheKey, imagePaths);
    this.inFlight.set(cacheKey, promise);

    try {
      return await promise;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  private async encodeAndStore(
    cacheParams: TimelapseCacheParams,
    cacheKey: string,
    imagePaths: string[],
  ): Promise<string> {
    if (this.activeConcurrentEncodes >= this.config.maxConcurrentEncodes) {
      throw new TooManyRequestsError(
        "Too many timelapse encodes are in progress. Please try again later.",
      );
    }

    this.activeConcurrentEncodes++;
    try {
      const mainVideoPath = await this.encoder.encodeMainVideo({
        imagePaths,
        frameRate: cacheParams.frameRate,
        backgroundColor: cacheParams.backgroundColor,
        cropBounds: cacheParams.cropBounds,
        scale: cacheParams.scale,
        raw: cacheParams.raw,
      });

      let finalSourcePath = mainVideoPath;
      try {
        if (
          cacheParams.raw !== "raw" &&
          cacheParams.showEndCard &&
          cacheParams.endHoldDurationMs !== null
        ) {
          const dims = getTimelapseVideoDimensions({
            canvasWidth: cacheParams.canvasWidth,
            canvasHeight: cacheParams.canvasHeight,
            cropBounds: cacheParams.cropBounds,
            scale: cacheParams.scale,
          });

          finalSourcePath = await this.endCard.appendEndCardTail({
            mainVideoPath,
            frameRate: cacheParams.frameRate,
            videoWidth: dims.width,
            videoHeight: dims.height,
            endHoldDurationMs: cacheParams.endHoldDurationMs,
          });

          if (finalSourcePath !== mainVideoPath) {
            await unlink(mainVideoPath).catch(() => undefined);
          }
        }

        return await this.store.writeAndUpsert(
          cacheParams,
          cacheKey,
          finalSourcePath,
        );
      } catch (error) {
        await unlink(mainVideoPath).catch(() => undefined);
        if (finalSourcePath !== mainVideoPath) {
          await unlink(finalSourcePath).catch(() => undefined);
        }
        throw error;
      }
    } finally {
      this.activeConcurrentEncodes--;
    }
  }

  private resolveCropBounds(
    bounds: Bounds | undefined,
    canvas: CanvasInfo,
  ): Bounds | undefined {
    if (!bounds) return undefined;

    const normalized: Bounds = {
      x0: Math.min(bounds.x0, bounds.x1),
      y0: Math.min(bounds.y0, bounds.y1),
      x1: Math.max(bounds.x0, bounds.x1),
      y1: Math.max(bounds.y0, bounds.y1),
    };

    const clamped: Bounds = {
      x0: Math.max(0, Math.min(normalized.x0, canvas.width - 1)),
      y0: Math.max(0, Math.min(normalized.y0, canvas.height - 1)),
      x1: Math.max(0, Math.min(normalized.x1, canvas.width - 1)),
      y1: Math.max(0, Math.min(normalized.y1, canvas.height - 1)),
    };

    // Inclusive bounds: width = x1 - x0 + 1
    const width = clamped.x1 - clamped.x0 + 1;
    const height = clamped.y1 - clamped.y0 + 1;

    if (width <= 0 || height <= 0) {
      throw new BadRequestError(
        "Bounds are invalid after normalization and clamping",
      );
    }

    // Full-canvas bounds (inclusive): compare against width - 1
    const isFullCanvas =
      clamped.x0 === 0 &&
      clamped.y0 === 0 &&
      clamped.x1 === canvas.width - 1 &&
      clamped.y1 === canvas.height - 1;

    return isFullCanvas ? undefined : clamped;
  }

  private calculateScale(
    canvas: CanvasInfo,
    cropBounds: Bounds | undefined,
  ): CanvasExportScale {
    const area =
      cropBounds ?
        (cropBounds.x1 - cropBounds.x0 + 1) *
        (cropBounds.y1 - cropBounds.y0 + 1)
      : canvas.width * canvas.height;

    if (area <= 90_000) return 4;
    if (area <= 360_000) return 2;
    return 1;
  }
}
