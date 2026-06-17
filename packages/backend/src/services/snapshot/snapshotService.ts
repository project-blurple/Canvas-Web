import type { CanvasInfo } from "@blurple-canvas-web/types";
import { snapshotPrisma } from "@/client/snapshots";
import { isSnapshotAvailableForCanvas } from "./snapshotPolicy";

export async function getSnapshots({
  canvasId,
  from,
  to,
}: {
  canvasId: CanvasInfo["id"];
  from?: Date;
  to?: Date;
}) {
  if (!isSnapshotAvailableForCanvas(canvasId)) {
    return [];
  }

  const where =
    from || to ?
      {
        canvas_id: canvasId,
        last_included_history_at: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      }
    : { canvas_id: canvasId };

  const manifests = await snapshotPrisma.snapshot_manifest.findMany({
    where,
    orderBy: { last_included_history_at: "asc" },
  });

  if (to) {
    const extra = await snapshotPrisma.snapshot_manifest.findFirst({
      where: {
        canvas_id: canvasId,
        last_included_history_at: { gt: to },
      },
      orderBy: { last_included_history_at: "asc" },
    });

    if (extra && !manifests.some((manifest) => manifest.id === extra.id)) {
      manifests.push(extra);
    }
  }

  return manifests;
}

export async function setSnapshotDirtyTimestamp(
  canvasId: CanvasInfo["id"],
  timestamp: Date,
) {
  if (!isSnapshotAvailableForCanvas(canvasId)) {
    return;
  }

  const invalidationTime = new Date();

  const updated = await snapshotPrisma.snapshot_cursor.updateMany({
    where: {
      canvas_id: canvasId,
      OR: [
        { dirty_from_timestamp: { gt: timestamp } },
        { dirty_from_timestamp: null },
      ],
    },
    data: {
      dirty_from_timestamp: timestamp,
    },
  });

  await snapshotPrisma.timelapse_manifest.updateMany({
    where: {
      canvas_id: canvasId,
      effective_end_at: { gte: timestamp },
      invalidated_at: null,
    },
    data: {
      invalidated_at: invalidationTime,
    },
  });

  if (updated.count === 0) {
    await snapshotPrisma.snapshot_cursor.create({
      data: {
        canvas_id: canvasId,
        dirty_from_timestamp: timestamp,
      },
    });
  }
}

export async function getSnapshotManifest(
  canvasId: CanvasInfo["id"],
  snapshotAt: Date,
) {
  if (!isSnapshotAvailableForCanvas(canvasId)) {
    return null;
  }

  return snapshotPrisma.snapshot_manifest.findFirst({
    where: {
      canvas_id: canvasId,
      snapshot_at: snapshotAt,
    },
  });
}
