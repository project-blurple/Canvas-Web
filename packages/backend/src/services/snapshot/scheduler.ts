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

interface ReadySnapshotWindowRow {
  canvas_id: number;
  bucket_start: Date;
  bucket_end: Date;
  history_count: number;
}

function getWindowCutoff(now: Date): Date {
  return new Date(
    Math.floor(now.getTime() / SNAPSHOT_WINDOW_MS) * SNAPSHOT_WINDOW_MS,
  );
}

function getSnapshotFilename(snapshotAt: Date): string {
  return `snapshot-${snapshotAt.getTime()}.png`;
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
  lastIncludedHistoryAt?: Date | null;
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

  const readyWindows = await prisma.$queryRaw<ReadySnapshotWindowRow[]>`
    SELECT
      canvas_id,
      bucket_start,
      bucket_end,
      history_count
    FROM history_snapshot_windows
    WHERE bucket_end <= ${cutoff}
    ORDER BY canvas_id ASC, bucket_start ASC
  `;

  // Fetch cursor state for all canvases from the sidecar before processing.
  const cursors = await snapshotPrisma.snapshot_cursor.findMany();
  const cursorByCanvas = new Map<number, snapshot_cursor>();
  for (const c of cursors) cursorByCanvas.set(c.canvas_id, c);

  let processed = 0;
  let skipped = 0;

  for (const window of readyWindows) {
    const canvasId = window.canvas_id;

    if (!isSnapshotAvailableForCanvas(canvasId)) {
      skipped += 1;
      continue;
    }

    // Decide generation based solely on window + cursor state (cursor map loaded above).
    const cursor = cursorByCanvas.get(canvasId) ?? null;

    const shouldGenerate =
      !cursor || // No cursor means this is the first snapshot, so we should generate.
      (cursor.dirty_from_timestamp ?
        cursor.dirty_from_timestamp <= window.bucket_end // If dirty_from_timestamp exists, only generate if the snapshot window end is after it
      : cursor.last_processed_timestamp < window.bucket_end); // If no dirty_from_timestamp, generate if last processed is before window end.

    if (!shouldGenerate) {
      skipped += 1;
      continue;
    }

    console.log(
      `Generating snapshot for canvas ${canvasId} covering ${window.bucket_start.toISOString()} - ${window.bucket_end.toISOString()} with ${window.history_count} history entries since last snapshot.`,
    );

    // Build snapshot (this function will read latest snapshot and history as needed).
    const image = await buildSnapshot({
      canvasId,
      before: window.bucket_end,
    });

    // Persist file then manifest.
    await persistSnapshot({
      canvasId,
      snapshotAt: window.bucket_end,
      image,
      historyCount: window.history_count,
    });

    // Update or create the cursor: set last_processed_timestamp and clear dirty when applicable.
    const snapshotAt = window.bucket_end;
    if (cursor) {
      const shouldClearDirty =
        cursor.dirty_from_timestamp != null &&
        snapshotAt.getTime() >= cursor.dirty_from_timestamp.getTime();

      await snapshotPrisma.snapshot_cursor.update({
        where: { canvas_id: canvasId },
        data: {
          last_processed_timestamp: snapshotAt,
          dirty_from_timestamp:
            shouldClearDirty ? null : cursor.dirty_from_timestamp,
        },
      });
    } else {
      await snapshotPrisma.snapshot_cursor.create({
        data: {
          canvas_id: canvasId,
          last_processed_timestamp: snapshotAt,
          dirty_from_timestamp: null,
        },
      });
    }

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
