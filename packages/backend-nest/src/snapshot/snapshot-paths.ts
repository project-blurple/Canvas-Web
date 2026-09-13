import path from "node:path";

export const SNAPSHOT_DATABASE_PATH = path.resolve(
  process.cwd(),
  "data",
  "snapshots",
  "snapshots.sqlite",
);

export const SNAPSHOT_IMAGE_ROOT = path.resolve(
  process.cwd(),
  "static",
  "snapshots",
);

export function getSnapshotDatabaseUrl(databasePath = SNAPSHOT_DATABASE_PATH) {
  return `file:${databasePath}`;
}

export function getSnapshotCanvasDirectory(
  imageRoot: string,
  canvasId: number,
): string {
  return path.resolve(imageRoot, String(canvasId));
}

export function getSnapshotImagePath(
  imageRoot: string,
  canvasId: number,
  snapshotAt: Date,
): string {
  return path.resolve(
    getSnapshotCanvasDirectory(imageRoot, canvasId),
    `snapshot-${snapshotAt.getTime()}.webp`,
  );
}
