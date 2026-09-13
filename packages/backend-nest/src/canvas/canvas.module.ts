import { Module } from "@nestjs/common";

import { CanvasAdminGuard } from "@/auth/guards/canvas-admin.guard";
import { DiscordModule } from "@/discord/discord.module";
import { RealtimeModule } from "@/realtime/realtime.module";
import { SnapshotModule } from "@/snapshot/snapshot.module";
import { CanvasController } from "./canvas.controller";
import { CanvasService } from "./canvas.service";
import { CanvasCacheService } from "./canvas-cache.service";
import { ExportService } from "./export.service";
import { PixelReconciliationService } from "./pixel-reconciliation.service";

@Module({
  imports: [DiscordModule, RealtimeModule, SnapshotModule],
  controllers: [CanvasController],
  providers: [
    CanvasService,
    CanvasCacheService,
    ExportService,
    PixelReconciliationService,
    CanvasAdminGuard,
  ],
  exports: [
    CanvasService,
    CanvasCacheService,
    ExportService,
    PixelReconciliationService,
  ],
})
export class CanvasModule {}
