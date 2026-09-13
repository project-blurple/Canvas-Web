import { Module } from "@nestjs/common";

import { SnapshotService } from "./snapshot.service";
import { SnapshotGeneratorService } from "./snapshot-generator.service";
import { SnapshotSchedulerService } from "./snapshot-scheduler.service";
import { SnapshotStoreService } from "./snapshot-store.service";

// `SnapshotPrismaService` is provided by the global `DatabaseModule`.
@Module({
  providers: [
    SnapshotStoreService,
    SnapshotService,
    SnapshotGeneratorService,
    SnapshotSchedulerService,
  ],
  exports: [SnapshotService],
})
export class SnapshotModule {}
