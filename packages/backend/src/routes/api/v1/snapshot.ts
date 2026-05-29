import {
  CanvasIdParamModel,
  SnapshotImageParamModel,
} from "@blurple-canvas-web/types";
import { type Response, Router } from "express";
import { NotFoundError } from "@/errors";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { getSnapshots } from "@/services/snapshot";
import { getSnapshotManifest } from "@/services/snapshot/snapshotService";

export const snapshotRouter = typedRouter(Router({ mergeParams: true }));

snapshotRouter.get(
  "/",
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    const snapshots = await getSnapshots({ canvasId: req.params.canvasId });

    res
      .status(200)
      .json(
        snapshots.map((snapshot) =>
          serializeSnapshot(snapshot, req.params.canvasId),
        ),
      );
  },
);

snapshotRouter.get(
  "/:snapshotAtMs.png",
  validate({ params: SnapshotImageParamModel }),
  async (req, res) => {
    const snapshotAt = new Date(req.params.snapshotAtMs);
    const snapshot = await getSnapshotManifest(req.params.canvasId, snapshotAt);

    if (!snapshot) {
      throw new NotFoundError("Snapshot not found");
    }

    await sendSnapshotFile(res, snapshot.image_path);
  },
);

function serializeSnapshot(
  snapshot: Awaited<ReturnType<typeof getSnapshots>>[number],
  canvasId: number,
) {
  return {
    canvasId,
    snapshotAt: snapshot.snapshot_at.toISOString(),
    lastIncludedHistoryAt: snapshot.last_included_history_at.toISOString(),
    historyCount: snapshot.history_count,
    fileSizeBytes: snapshot.file_size_bytes ?? null,
    imagePath: `/api/v1/canvas/${encodeURIComponent(canvasId)}/snapshots/${encodeURIComponent(snapshot.snapshot_at.getTime())}.png`,
  };
}

async function sendSnapshotFile(
  res: Response,
  filePath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    res.sendFile(filePath, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
