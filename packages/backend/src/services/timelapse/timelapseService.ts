import { mkdir, unlink } from "node:fs/promises";
import { snapshotPrisma } from "@/client/snapshots";
import {
  getTimelapseCanvasDirectory,
  getTimelapseVideoPath,
} from "@/snapshot/paths";
import {
  boundsWithDimensions,
  calculateScale,
  clamp,
  normalizeBounds,
} from "@/utils";
import { getCanvasInfo } from "../canvasService";
import { getSnapshots } from "../snapshot/snapshotService";
import {
  buildTimelapseCacheKey,
  buildTimelapseManifestRecord,
  checkCachedTimelapseExists,
  writeCachedTimelapseFile,
} from "./cache";
import {
  encodeMainVideoFromImages,
  getTimelapseVideoDimensions,
} from "./encoding";
import { appendTimelapseEndCardTail } from "./endCard";
import type {
  Bounds,
  CanvasInfo,
  GenerateTimelapseParams,
  TimelapseCacheParams,
} from "./types";
import { getTimelapseVideoFormat, notQuiteBlackRgba } from "./types";

// Map of cacheKey -> Promise resolving to generated file path for in-flight requests
const inFlightTimelapses = new Map<string, Promise<string>>();

/**
 * Generates a timelapse video and returns the file path to the cached video.
 * The video is written to disk and can be streamed to clients using res.sendFile().
 */
export async function generateTimelapse({
  canvasId,
  start,
  end,
  bounds,
  frameRate = 30,
  endHoldDurationMs = 2000,
  showEndCard = true,
  scale,
  backgroundColor = notQuiteBlackRgba,
  raw = "default",
}: GenerateTimelapseParams): Promise<string> {
  if (raw === "raw") {
    endHoldDurationMs = null;
    scale = 1;
    showEndCard = false;
  }

  /// Validate parameters

  if (!Number.isFinite(frameRate) || frameRate <= 0) {
    throw new Error("frameRate must be a positive number");
  }

  const snapshots = await getSnapshots({
    canvasId,
    from: start,
    to: end,
  });

  if (snapshots.length === 0) {
    throw new Error(`No snapshots found for canvas ${canvasId}`);
  }

  const orderedSnapshots = [...snapshots].sort(
    (a, b) => a.snapshot_at.getTime() - b.snapshot_at.getTime(),
  );

  const imagePaths = orderedSnapshots.map((s) => s.image_path);
  const effectiveStartAt = orderedSnapshots[0]?.snapshot_at;
  const effectiveEndAt = orderedSnapshots.at(-1)?.snapshot_at;

  if (!effectiveStartAt || !effectiveEndAt) {
    throw new Error(
      `Could not determine canonical snapshot bounds for canvas ${canvasId}`,
    );
  }

  let cropBounds: Bounds | undefined;
  const canvas = await getCanvasInfo(canvasId);

  if (bounds) {
    const normalizedBounds = normalizeBounds(bounds);

    const clampedBounds = boundsWithDimensions({
      x0: clamp(normalizedBounds.x0, 0, canvas.width - 1),
      y0: clamp(normalizedBounds.y0, 0, canvas.height - 1),
      x1: clamp(normalizedBounds.x1, 0, canvas.width - 1),
      y1: clamp(normalizedBounds.y1, 0, canvas.height - 1),
    });

    if (clampedBounds.width <= 0 || clampedBounds.height <= 0) {
      throw new Error("Bounds are invalid after normalization and clamping");
    }

    const isFullCanvasBounds =
      clampedBounds.x0 === 0 &&
      clampedBounds.y0 === 0 &&
      clampedBounds.x1 === canvas.width &&
      clampedBounds.y1 === canvas.height;

    if (!isFullCanvasBounds) {
      cropBounds = clampedBounds;
    }
  }

  const resolvedScale =
    scale ??
    calculateScale(
      cropBounds ?
        (cropBounds.x1 - cropBounds.x0) * (cropBounds.y1 - cropBounds.y0)
      : canvas.width * canvas.height,
    );

  /// Check cache, return if exists

  return await getOrCreateTimelapseFromCache(
    {
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
    },
    imagePaths,
  );
}

export async function getOrCreateTimelapseFromCache(
  cacheParams: TimelapseCacheParams,
  imagePaths: string[],
): Promise<string> {
  const canvasId = cacheParams.canvasId;

  const cacheKey = buildTimelapseCacheKey(cacheParams);
  const timelapseFileName = `${cacheKey}.${getTimelapseVideoFormat(cacheParams.raw)}`;
  const timelapseFilePath = getTimelapseVideoPath(canvasId, timelapseFileName);

  const existingCache = await snapshotPrisma.timelapse_manifest.findUnique({
    where: { cache_key: cacheKey },
  });

  if (existingCache?.invalidated_at === null) {
    const fileExists = await checkCachedTimelapseExists(
      existingCache.file_path,
    );
    if (fileExists) {
      return existingCache.file_path;
    }
  }

  // Coalesce concurrent identical requests: if a generation is already in-flight,
  // attach to that Promise and return its result instead of starting another.
  const existingInFlight = inFlightTimelapses.get(cacheKey);
  if (existingInFlight) {
    return await existingInFlight;
  }

  const generationPromise = (async () => {
    await mkdir(getTimelapseCanvasDirectory(canvasId), { recursive: true });

    const rawBuffer = await encodeMainVideoFromImages({
      imagePaths,
      frameRate: cacheParams.frameRate,
      backgroundColor: cacheParams.backgroundColor,
      cropBounds: cacheParams.cropBounds,
      scale: cacheParams.scale,
      raw: cacheParams.raw,
    });

    if (cacheParams.raw === "raw") {
      return await writeCachedRawTimelapse({
        canvasId,
        cacheParams,
        rawBuffer,
      });
    }

    const videoDimensions = getTimelapseVideoDimensions({
      canvasWidth: cacheParams.canvasWidth,
      canvasHeight: cacheParams.canvasHeight,
      cropBounds: cacheParams.cropBounds,
      scale: cacheParams.scale,
    });

    const generatedBuffer =
      cacheParams.showEndCard && cacheParams.endHoldDurationMs !== null ?
        await appendTimelapseEndCardTail({
          timelapseBuffer: rawBuffer,
          frameRate: cacheParams.frameRate,
          videoWidth: videoDimensions.width,
          videoHeight: videoDimensions.height,
          endHoldDurationMs: cacheParams.endHoldDurationMs ?? 0,
        })
      : rawBuffer;

    try {
      const fileSizeBytes = await writeCachedTimelapseFile({
        finalPath: timelapseFilePath,
        buffer: generatedBuffer,
      });

      const manifestRecord = buildTimelapseManifestRecord(
        cacheParams,
        cacheKey,
        timelapseFilePath,
        fileSizeBytes,
      );

      await snapshotPrisma.timelapse_manifest.upsert({
        where: { cache_key: cacheKey },
        create: manifestRecord,
        update: manifestRecord,
      });
    } catch (error) {
      await unlink(timelapseFilePath).catch(() => undefined);
      throw error;
    }

    return timelapseFilePath;
  })();

  inFlightTimelapses.set(cacheKey, generationPromise);

  try {
    return await generationPromise;
  } finally {
    inFlightTimelapses.delete(cacheKey);
  }
}

export async function writeCachedRawTimelapse({
  canvasId,
  cacheParams,
  rawBuffer,
}: {
  canvasId: CanvasInfo["id"];
  cacheParams: TimelapseCacheParams;
  rawBuffer: Buffer;
}): Promise<string> {
  const rawCacheParams: TimelapseCacheParams = {
    ...cacheParams,
    endHoldDurationMs: null,
    showEndCard: false,
  };
  const rawCacheKey = buildTimelapseCacheKey(rawCacheParams);
  const rawFileName = `${rawCacheKey}.webm`;
  const rawFilePath = getTimelapseVideoPath(canvasId, rawFileName);

  try {
    const rawSize = await writeCachedTimelapseFile({
      finalPath: rawFilePath,
      buffer: rawBuffer,
    });

    const rawManifest = buildTimelapseManifestRecord(
      cacheParams,
      rawCacheKey,
      rawFilePath,
      rawSize,
    );

    await snapshotPrisma.timelapse_manifest.upsert({
      where: { cache_key: rawCacheKey },
      create: rawManifest,
      update: rawManifest,
    });
  } catch (err) {
    await unlink(rawFilePath).catch(() => undefined);
    throw err;
  }

  return rawFilePath;
}
