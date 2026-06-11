import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { prisma } from "@/client";
import { type snapshot_cursor, snapshotPrisma } from "@/client/snapshots";
import config from "@/config";
import { getSnapshotImagePath } from "@/snapshot/paths";
import { buildSnapshot } from "./generateSnapshotService";
import {
  isSnapshotAvailableForCanvas,
  isSnapshotGenerationEnabled,
} from "./snapshotPolicy";

const SNAPSHOT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

let isRunning = false;
let timer: NodeJS.Timeout | null = null;

function getWindowCutoff(now: Date): Date {
  return new Date(
    Math.floor(now.getTime() / SNAPSHOT_WINDOW_MS) * SNAPSHOT_WINDOW_MS,
  );
}

function getSnapshotFilename(snapshotAt: Date): string {
  return `snapshot-${snapshotAt.getTime()}.webp`;
}

async function persistSnapshot({
  canvasId,
  snapshotAt,
  image,
  historyCount,
  lastIncludedHistoryAt,
}: {
  canvasId: number;
  snapshotAt: Date;
  image: Buffer;
  historyCount: number;
  lastIncludedHistoryAt: Date;
}): Promise<void> {
  const filePath = getSnapshotImagePath(
    canvasId,
    getSnapshotFilename(snapshotAt),
  );
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, image);

  await snapshotPrisma.snapshot_manifest.upsert({
    where: {
      canvas_id_snapshot_at: {
        canvas_id: canvasId,
        snapshot_at: snapshotAt,
      },
    },
    create: {
      canvas_id: canvasId,
      snapshot_at: snapshotAt,
      history_count: historyCount,
      image_path: filePath,
      last_included_history_at: lastIncludedHistoryAt,
    },
    update: {
      history_count: historyCount,
      image_path: filePath,
      last_included_history_at: lastIncludedHistoryAt,
    },
  });
}

export async function runSnapshotSchedulerCycle(): Promise<{
  processed: number;
  skipped: number;
}> {
  if (!isSnapshotGenerationEnabled()) {
    return { processed: 0, skipped: 0 };
  }

  const now = new Date();
  const cutoff = getWindowCutoff(now);

  const canvasIds = config.snapshot.availableForCanvases;
  if (canvasIds.length === 0) {
    return { processed: 0, skipped: 0 };
  }

  const cursors = await snapshotPrisma.snapshot_cursor.findMany({
    where: { canvas_id: { in: canvasIds } },
  });
  const cursorByCanvas = new Map<number, snapshot_cursor>();
  for (const cursor of cursors) cursorByCanvas.set(cursor.canvas_id, cursor);

  for (const canvasId of canvasIds) {
    if (!cursorByCanvas.has(canvasId)) {
      const newCursor = await snapshotPrisma.snapshot_cursor.create({
        data: {
          canvas_id: canvasId,
          last_processed_timestamp: new Date(0),
          dirty_from_timestamp: null,
        },
      });
      cursorByCanvas.set(canvasId, newCursor);
    }
  }

  const earliestTimestampMs = Math.min(
    ...Array.from(cursorByCanvas.values(), (cursor) => {
      const effectiveTimestamp =
        cursor.dirty_from_timestamp ?? cursor.last_processed_timestamp;
      return (
        Math.floor(effectiveTimestamp.getTime() / SNAPSHOT_WINDOW_MS) *
        SNAPSHOT_WINDOW_MS
      );
    }),
  );
  const lowerBound = new Date(earliestTimestampMs);

  const readyWindows = await prisma.$kysely
    .selectFrom("history_snapshot_windows")
    .select(["canvas_id", "bucket_start", "bucket_end", "history_count"])
    .where("canvas_id", "in", canvasIds)
    .where("bucket_start", ">=", lowerBound)
    .where("bucket_end", "<=", cutoff)
    .orderBy("canvas_id", "asc")
    .orderBy("bucket_start", "asc")
    .execute();

  let processed = 0;
  let skipped = 0;

  for (const window of readyWindows) {
    const canvasId = window.canvas_id;

    if (!isSnapshotAvailableForCanvas(canvasId)) {
      skipped += 1;
      continue;
    }

    // Decide generation based solely on window + cursor state (cursor map loaded above).
    const cursor = cursorByCanvas.get(canvasId);
    if (!cursor) {
      // This should never happen since we ensure cursors exist for all canvases above, but just in case...
      console.warn(
        `No snapshot cursor found for canvas ${canvasId}, skipping snapshot generation for this cycle.`,
      );
      skipped += 1;
      continue;
    }

    const shouldGenerate =
      cursor.dirty_from_timestamp ?
        cursor.dirty_from_timestamp <= window.bucket_end // If dirty_from_timestamp exists, only generate if the snapshot window end is after it
      : cursor.last_processed_timestamp < window.bucket_end; // If no dirty_from_timestamp, generate if last processed is before window end.

    if (!shouldGenerate) {
      skipped += 1;
      continue;
    }

    console.log(
      `Generating snapshot for canvas ${canvasId} covering ${window.bucket_start.toISOString()} - ${window.bucket_end.toISOString()} with ${window.history_count} history entries since last snapshot.`,
    );

    // Build snapshot (this function will read latest snapshot and history as needed).
    const { image, lastIncludedHistoryAt } = await buildSnapshot({
      canvasId,
      before: window.bucket_end,
    });

    // Persist file then manifest.
    await persistSnapshot({
      canvasId,
      snapshotAt: window.bucket_end,
      image,
      historyCount: window.history_count,
      lastIncludedHistoryAt,
    });

    // Update the cursor using the current DB value, not the stale in-memory cursor.
    const snapshotAt = window.bucket_end;
    await snapshotPrisma.$transaction([
      snapshotPrisma.snapshot_cursor.update({
        where: { canvas_id: canvasId },
        data: {
          last_processed_timestamp: snapshotAt,
        },
      }),
      snapshotPrisma.snapshot_cursor.updateMany({
        where: {
          canvas_id: canvasId,
          dirty_from_timestamp: { lte: snapshotAt },
        },
        data: {
          dirty_from_timestamp: null,
        },
      }),
    ]);

    processed += 1;
  }

  if (processed > 0) {
    console.log(
      `Snapshot scheduler cycle completed. Processed ${processed} ${processed === 1 ? "snapshot" : "snapshots"}, skipped ${skipped} ${skipped === 1 ? "window" : "windows"}.`,
    );
  }

  return { processed, skipped };
}

export function startSnapshotScheduler(): () => void {
  if (!isSnapshotGenerationEnabled()) {
    return () => undefined;
  }

  const tick = () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    void runSnapshotSchedulerCycle()
      .catch((error: unknown) => {
        console.error("Snapshot scheduler cycle failed", error);
      })
      .finally(() => {
        isRunning = false;
      });
  };

  console.log(
    "Starting snapshot scheduler with interval",
    config.snapshot.schedulerIntervalMs,
    "ms",
  );

  tick();

  timer = setInterval(tick, config.snapshot.schedulerIntervalMs);

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
