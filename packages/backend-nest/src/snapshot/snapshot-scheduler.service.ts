import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";

import { PrismaService } from "@/common/database/core/prisma.service";
import type { SnapshotCursor } from "@/common/database/snapshot/snapshot-prisma.client";
import type { SnapshotConfig } from "@/config/snapshot.config";
import { snapshotConfig } from "@/config/snapshot.config";
import { SNAPSHOT_SCHEDULER_TIMEOUT_NAME } from "./snapshot.constants";
import { SnapshotService } from "./snapshot.service";
import { SnapshotGeneratorService } from "./snapshot-generator.service";
import { SnapshotStoreService } from "./snapshot-store.service";
import {
  computeLowerBound,
  getWindowCutoff,
  shouldGenerate,
} from "./snapshot-windows";

interface ReadyWindow {
  canvasId: number;
  bucketStart: Date;
  bucketEnd: Date;
  historyCount: number;
}

/**
 * Periodically generates snapshots for completed 10-minute history windows.
 *
 * Rather than a fixed-rate `setInterval`, this re-arms a single timeout *after*
 * each cycle settles. That makes overlapping runs impossible by construction
 * (no "is running" guard, no tick pile-up if a cycle outlasts the interval).
 * The timeout is registered with `SchedulerRegistry` so Nest clears it on
 * shutdown, and `onApplicationShutdown` stops the chain from re-arming.
 */
@Injectable()
export class SnapshotSchedulerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SnapshotSchedulerService.name);
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotService: SnapshotService,
    private readonly snapshotStore: SnapshotStoreService,
    private readonly snapshotGenerator: SnapshotGeneratorService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(snapshotConfig.KEY) private readonly config: SnapshotConfig,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.snapshotService.isGenerationEnabled()) {
      return;
    }

    this.logger.log(
      `Starting snapshot scheduler with interval ${this.config.schedulerIntervalMs}ms`,
    );

    this.scheduleNextCycle(0);
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (
      this.schedulerRegistry.doesExist(
        "timeout",
        SNAPSHOT_SCHEDULER_TIMEOUT_NAME,
      )
    ) {
      this.schedulerRegistry.deleteTimeout(SNAPSHOT_SCHEDULER_TIMEOUT_NAME);
    }
  }

  private scheduleNextCycle(delayMs: number): void {
    if (this.stopped) {
      return;
    }

    const timeout = setTimeout(() => {
      void this.runScheduledCycle();
    }, delayMs);
    this.schedulerRegistry.addTimeout(SNAPSHOT_SCHEDULER_TIMEOUT_NAME, timeout);
  }

  private async runScheduledCycle(): Promise<void> {
    if (
      this.schedulerRegistry.doesExist(
        "timeout",
        SNAPSHOT_SCHEDULER_TIMEOUT_NAME,
      )
    ) {
      this.schedulerRegistry.deleteTimeout(SNAPSHOT_SCHEDULER_TIMEOUT_NAME);
    }

    try {
      await this.runCycle();
    } catch (error: unknown) {
      this.logger.error("Snapshot scheduler cycle failed", error);
    } finally {
      this.scheduleNextCycle(this.config.schedulerIntervalMs);
    }
  }

  async runCycle(): Promise<{ processed: number; skipped: number }> {
    if (!this.snapshotService.isGenerationEnabled()) {
      return { processed: 0, skipped: 0 };
    }

    const canvasIds = this.config.availableForCanvases;
    if (canvasIds.length === 0) {
      return { processed: 0, skipped: 0 };
    }

    const cutoff = getWindowCutoff(new Date());
    const cursorByCanvas = await this.snapshotStore.ensureCursors(canvasIds);
    const lowerBound = computeLowerBound(cursorByCanvas.values());

    const readyWindows = await this.prisma.$kysely
      .selectFrom("historySnapshotWindows")
      .select(["canvasId", "bucketStart", "bucketEnd", "historyCount"])
      .where("canvasId", "in", canvasIds)
      .where("bucketStart", ">=", lowerBound)
      .where("bucketEnd", "<=", cutoff)
      .orderBy("canvasId", "asc")
      .orderBy("bucketStart", "asc")
      .execute();

    let processed = 0;
    let skipped = 0;

    for (const window of readyWindows) {
      if (await this.processWindow(window, cursorByCanvas)) {
        processed += 1;
      } else {
        skipped += 1;
      }
    }

    if (processed > 0) {
      this.logger.log(
        `Snapshot scheduler cycle completed. Processed ${processed} ${processed === 1 ? "snapshot" : "snapshots"}, skipped ${skipped} ${skipped === 1 ? "window" : "windows"}.`,
      );
    }

    return { processed, skipped };
  }

  private async processWindow(
    window: ReadyWindow,
    cursorByCanvas: Map<number, SnapshotCursor>,
  ): Promise<boolean> {
    const { canvasId, bucketStart, bucketEnd, historyCount } = window;

    if (!this.snapshotService.isAvailableForCanvas(canvasId)) {
      return false;
    }

    const cursor = cursorByCanvas.get(canvasId);
    if (!cursor) {
      this.logger.warn(
        `No snapshot cursor found for canvas ${canvasId}, skipping snapshot generation for this cycle.`,
      );
      return false;
    }

    if (!shouldGenerate(cursor, bucketEnd)) {
      return false;
    }

    this.logger.log(
      `Generating snapshot for canvas ${canvasId} covering ${bucketStart.toISOString()} - ${bucketEnd.toISOString()} with ${historyCount} history entries since last snapshot.`,
    );

    const { image, lastIncludedHistoryAt } =
      await this.snapshotGenerator.buildSnapshot({
        canvasId,
        before: bucketEnd,
      });

    await this.snapshotStore.upsertManifest({
      canvasId,
      snapshotAt: bucketEnd,
      image,
      historyCount,
      lastIncludedHistoryAt,
    });

    await this.snapshotStore.advanceCursor(canvasId, bucketEnd);
    return true;
  }
}
