import { Inject, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";

import type { TimelapseConfig } from "@/config/timelapse.config";
import { timelapseConfig } from "@/config/timelapse.config";
import { TimelapseStoreService } from "./timelapse-store.service";

const EVICTION_INTERVAL_MS = 5 * 60 * 1_000;

@Injectable()
export class TimelapseEvictionService {
  private readonly logger = new Logger(TimelapseEvictionService.name);

  constructor(
    private readonly store: TimelapseStoreService,
    @Inject(timelapseConfig.KEY) private readonly config: TimelapseConfig,
  ) {}

  @Interval(EVICTION_INTERVAL_MS)
  async evictStaleTimelapses(): Promise<void> {
    try {
      const evicted = await this.store.evictStaleInvalidated(
        this.config.invalidationTtlMs,
      );
      if (evicted > 0) {
        this.logger.log(`Eviction cycle completed: ${evicted} removed`);
      }
    } catch (error) {
      this.logger.error("Timelapse eviction cycle failed", error);
    }
  }
}
