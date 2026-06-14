import { Module } from "@nestjs/common";

import { BotApiKeyGuard } from "@/auth/guards/bot-api-key.guard";
import { BlocklistModule } from "@/blocklist/blocklist.module";
import { CanvasModule } from "@/canvas/canvas.module";
import { DiscordModule } from "@/discord/discord.module";
import { RealtimeModule } from "@/realtime/realtime.module";
import { PixelController } from "./pixel.controller";
import { PixelService } from "./pixel.service";

@Module({
  imports: [BlocklistModule, CanvasModule, DiscordModule, RealtimeModule],
  controllers: [PixelController],
  providers: [PixelService, BotApiKeyGuard],
  exports: [PixelService],
})
export class PixelModule {}
