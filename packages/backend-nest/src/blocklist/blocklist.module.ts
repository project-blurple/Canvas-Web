import { Module } from "@nestjs/common";

import { CanvasModeratorGuard } from "@/auth/guards/canvas-moderator.guard";
import { CanvasModule } from "@/canvas/canvas.module";
import { DiscordModule } from "@/discord/discord.module";
import { BlocklistController } from "./blocklist.controller";
import { BlocklistService } from "./blocklist.service";

@Module({
  imports: [CanvasModule, DiscordModule],
  controllers: [BlocklistController],
  providers: [BlocklistService, CanvasModeratorGuard],
  exports: [BlocklistService],
})
export class BlocklistModule {}
