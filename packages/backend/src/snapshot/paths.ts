import { resolve } from "node:path";

export const SNAPSHOT_IMAGE_ROOT = resolve(
  process.cwd(),
  "static",
  "snapshots",
);
export const SNAPSHOT_DATABASE_PATH = resolve(
  process.cwd(),
  "data",
  "snapshots",
  "snapshots.sqlite",
);
export const SNAPSHOT_DATABASE_URL = "file:./data/snapshots/snapshots.sqlite";

export function getSnapshotCanvasDirectory(canvasId: number): string {
  return resolve(SNAPSHOT_IMAGE_ROOT, String(canvasId));
}

export function getSnapshotImagePath(
  canvasId: number,
  filename: string,
): string {
  return resolve(getSnapshotCanvasDirectory(canvasId), filename);
}
