import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import type { SnapshotDirtyEvent } from "@/snapshot/snapshot.events";
import { SNAPSHOT_DIRTY_EVENT } from "@/snapshot/snapshot.events";
import { TimelapseStoreService } from "./timelapse-store.service";

@Injectable()
export class TimelapseInvalidationListener {
  private readonly logger = new Logger(TimelapseInvalidationListener.name);

  constructor(private readonly store: TimelapseStoreService) {}

  @OnEvent(SNAPSHOT_DIRTY_EVENT, { suppressErrors: true })
  async handleSnapshotDirty(event: SnapshotDirtyEvent): Promise<void> {
    try {
      await this.store.invalidateFrom(event.canvasId, event.timestamp);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate timelapses for canvas ${event.canvasId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
