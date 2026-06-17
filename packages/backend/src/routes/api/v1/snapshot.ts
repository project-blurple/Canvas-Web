import { CanvasIdParamModel } from "@blurple-canvas-web/types";
import { Router } from "express";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { getSnapshots } from "@/services/snapshot";

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

function serializeSnapshot(
  snapshot: Awaited<ReturnType<typeof getSnapshots>>[number],
  canvasId: number,
) {
  return {
    canvasId,
    snapshotAt: snapshot.snapshot_at.toISOString(),
    lastIncludedHistoryAt: snapshot.last_included_history_at.toISOString(),
    historyCount: snapshot.history_count,
  };
}
