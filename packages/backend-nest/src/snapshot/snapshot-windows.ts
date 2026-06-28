import type { SnapshotCursor } from "@/common/database/snapshot/snapshot-prisma.client";
import { SNAPSHOT_WINDOW_MS } from "./snapshot.constants";

/** Start of the current (in-progress) window; only windows ending at or before it are ready. */
export function getWindowCutoff(now: Date): Date {
  return new Date(
    Math.floor(now.getTime() / SNAPSHOT_WINDOW_MS) * SNAPSHOT_WINDOW_MS,
  );
}

/** Earliest window start any canvas still needs, snapped to the window grid. */
export function computeLowerBound(cursors: Iterable<SnapshotCursor>): Date {
  let earliestTimestampMs = Number.POSITIVE_INFINITY;

  for (const cursor of cursors) {
    const effectiveTimestamp =
      cursor.dirtyFromTimestamp ?? cursor.lastProcessedTimestamp;
    const snapped =
      Math.floor(effectiveTimestamp.getTime() / SNAPSHOT_WINDOW_MS) *
      SNAPSHOT_WINDOW_MS;
    earliestTimestampMs = Math.min(earliestTimestampMs, snapped);
  }

  // No cursors: fall back to epoch rather than producing an Invalid Date.
  if (!Number.isFinite(earliestTimestampMs)) {
    return new Date(0);
  }

  return new Date(earliestTimestampMs);
}

/** A window is due when it extends past the cursor (or its dirty marker). */
export function shouldGenerate(
  cursor: SnapshotCursor,
  bucketEnd: Date,
): boolean {
  return cursor.dirtyFromTimestamp ?
      cursor.dirtyFromTimestamp <= bucketEnd
    : cursor.lastProcessedTimestamp < bucketEnd;
}
