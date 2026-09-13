import type { CanvasInfo } from "@blurple-canvas-web/types";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import type { SnapshotManifest } from "@/common/database/snapshot/snapshot-prisma.client";
import type { SnapshotConfig } from "@/config/snapshot.config";
import { snapshotConfig } from "@/config/snapshot.config";
import type { SnapshotDirtyEvent } from "./snapshot.events";
import { SNAPSHOT_DIRTY_EVENT } from "./snapshot.events";
import { SnapshotStoreService } from "./snapshot-store.service";

export interface GetSnapshotsParams {
  canvasId: CanvasInfo["id"];
  from?: Date;
  to?: Date;
}

/**
 * Read + invalidation API for canvas snapshots, plus the feature-gating policy
 * (global flag combined with the per-canvas allowlist). Snapshot generation
 * itself lives in the generator and scheduler services.
 */
@Injectable()
export class SnapshotService {
  private readonly availableCanvasIds: Set<number>;

  constructor(
    private readonly snapshotStore: SnapshotStoreService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(snapshotConfig.KEY) private readonly config: SnapshotConfig,
  ) {
    this.availableCanvasIds = new Set(config.availableForCanvases);
  }

  isGenerationEnabled(): boolean {
    return this.config.generate;
  }

  isAvailableForCanvas(canvasId: number): boolean {
    return this.isGenerationEnabled() && this.availableCanvasIds.has(canvasId);
  }

  async getSnapshots({
    canvasId,
    from,
    to,
  }: GetSnapshotsParams): Promise<SnapshotManifest[]> {
    if (!this.isAvailableForCanvas(canvasId)) {
      return [];
    }

    return this.snapshotStore.findManifests({ canvasId, from, to });
  }

  /**
   * Marks a canvas dirty from the given timestamp so the scheduler regenerates
   * every snapshot covering history at or after it. Only ever moves the dirty
   * marker earlier; a no-op when the feature is disabled for the canvas.
   */
  async setSnapshotDirtyTimestamp(
    canvasId: CanvasInfo["id"],
    timestamp: Date,
  ): Promise<void> {
    if (!this.isAvailableForCanvas(canvasId)) {
      return;
    }

    await this.snapshotStore.markDirty(canvasId, timestamp);

    this.eventEmitter.emit(SNAPSHOT_DIRTY_EVENT, {
      canvasId,
      timestamp,
    } satisfies SnapshotDirtyEvent);
  }
}
