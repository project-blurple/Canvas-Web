import { Module } from "@nestjs/common";

import { AuthModule } from "@/auth/auth.module";
import { CanvasAdminGuard } from "@/auth/guards/canvas-admin.guard";
import { CanvasModeratorGuard } from "@/auth/guards/canvas-moderator.guard";
import { BlocklistModule } from "@/blocklist/blocklist.module";
import { CanvasModule } from "@/canvas/canvas.module";
import { DiscordModule } from "@/discord/discord.module";
import { PixelModule } from "@/pixel/pixel.module";
import { HistoryController } from "./history.controller";
import { HistoryService } from "./history.service";

@Module({
  imports: [
    PixelModule,
    CanvasModule,
    BlocklistModule,
    DiscordModule,
    AuthModule,
  ],
  controllers: [HistoryController],
  providers: [HistoryService, CanvasModeratorGuard, CanvasAdminGuard],
  exports: [HistoryService],
})
export class HistoryModule {}
