import { forwardRef, Module } from "@nestjs/common";

import { CanvasModule } from "@/canvas/canvas.module";
import { SnapshotModule } from "@/snapshot/snapshot.module";
import { FfmpegService } from "./ffmpeg.service";
import { TimelapseService } from "./timelapse.service";
import { TimelapseEncoderService } from "./timelapse-encoder.service";
import { TimelapseEndCardService } from "./timelapse-end-card.service";
import { TimelapseEvictionService } from "./timelapse-eviction.service";
import { TimelapseInvalidationListener } from "./timelapse-invalidation.listener";
import { TimelapseStoreService } from "./timelapse-store.service";

// `SnapshotPrismaService` is provided by the global `DatabaseModule`.
@Module({
  imports: [forwardRef(() => CanvasModule), SnapshotModule],
  providers: [
    FfmpegService,
    TimelapseEncoderService,
    TimelapseEndCardService,
    TimelapseStoreService,
    TimelapseService,
    TimelapseEvictionService,
    TimelapseInvalidationListener,
  ],
  exports: [TimelapseService],
})
export class TimelapseModule {}
