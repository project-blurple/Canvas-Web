export {
  getSnapshotCanvasDirectory,
  getSnapshotImagePath,
  SNAPSHOT_DATABASE_PATH,
  SNAPSHOT_DATABASE_URL,
  SNAPSHOT_IMAGE_ROOT,
} from "@/snapshot/paths";
export {
  type GetLatestHistoryEntryInRangeParams as GetHistoryEntriesBetweenParams,
  type GetLatestSnapshotForCanvasParams,
  getLatestHistoryEntriesInRange as getHistoryEntriesBetween,
  getLatestSnapshotForCanvas,
  type LatestHistoryEntry as HistoryEntryBetween,
  type LatestSnapshotForCanvas,
} from "./generateSnapshotService";
