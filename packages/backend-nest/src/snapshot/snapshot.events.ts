export const SNAPSHOT_DIRTY_EVENT = "snapshot.dirty";

export interface SnapshotDirtyEvent {
  canvasId: number;
  timestamp: Date;
}
