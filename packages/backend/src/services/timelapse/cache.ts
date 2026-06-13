import { createHash } from "node:crypto";
import { rename, stat, unlink, writeFile } from "node:fs/promises";
import type { TimelapseCacheParams } from "./types";

export function buildTimelapseCacheKey({
  canvasId,
  effectiveStartAt,
  effectiveEndAt,
  cropBounds,
  frameRate,
  endHoldDurationMs,
  showEndCard,
  scale,
  backgroundColor,
  raw,
}: TimelapseCacheParams): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        canvasId,
        effectiveStartAt: effectiveStartAt.toISOString(),
        effectiveEndAt: effectiveEndAt.toISOString(),
        bounds:
          cropBounds ?
            {
              x0: cropBounds.x0,
              y0: cropBounds.y0,
              x1: cropBounds.x1,
              y1: cropBounds.y1,
            }
          : null,
        frameRate,
        endHoldDurationMs,
        showEndCard,
        scale,
        backgroundColor,
        raw,
      }),
    )
    .digest("hex");
}

export function buildTimelapseManifestRecord(
  cacheParams: TimelapseCacheParams,
  cacheKey: string,
  filePath: string,
  fileSize: number,
) {
  return {
    canvas_id: cacheParams.canvasId,
    requested_start_at: cacheParams.requestedStartAt,
    requested_end_at: cacheParams.requestedEndAt,
    effective_start_at: cacheParams.effectiveStartAt,
    effective_end_at: cacheParams.effectiveEndAt,
    bounds_x0: cacheParams.cropBounds?.x0 ?? null,
    bounds_y0: cacheParams.cropBounds?.y0 ?? null,
    bounds_x1: cacheParams.cropBounds?.x1 ?? null,
    bounds_y1: cacheParams.cropBounds?.y1 ?? null,
    scale: cacheParams.scale,
    frame_rate: cacheParams.frameRate,
    end_hold_duration_ms: cacheParams.endHoldDurationMs ?? 0,
    show_end_card: cacheParams.showEndCard,
    background_color: JSON.stringify(cacheParams.backgroundColor),
    cache_key: cacheKey,
    file_path: filePath,
    file_size_bytes: fileSize,
    invalidated_at: null,
  } as const;
}

export async function checkCachedTimelapseExists(
  filePath: string,
): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeCachedTimelapseFile({
  finalPath,
  buffer,
}: {
  finalPath: string;
  buffer: Buffer;
}): Promise<number> {
  const tempPath = `${finalPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, buffer);

  try {
    await unlink(finalPath);
  } catch {
    // File may not exist yet; that's fine.
  }

  try {
    await rename(tempPath, finalPath);
    const fileStats = await stat(finalPath);
    return fileStats.size;
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}
