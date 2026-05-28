import type { CanvasInfo } from "@blurple-canvas-web/types";
import { snapshotPrisma } from "@/client/snapshots";

export async function getSnapshots({
  canvasId,
  from,
  to,
}: {
  canvasId: CanvasInfo["id"];
  from?: Date;
  to?: Date;
}) {
  return await snapshotPrisma.snapshot_manifest.findMany({
    where: {
      canvas_id: canvasId,
      snapshot_at: {
        gte: from,
        lte: to,
      },
    },
    orderBy: {
      snapshot_at: "desc",
    },
  });
}
