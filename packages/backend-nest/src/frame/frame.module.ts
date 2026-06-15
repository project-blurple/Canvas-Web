import { Module } from "@nestjs/common";

import { CanvasModule } from "@/canvas/canvas.module";
import { DiscordModule } from "@/discord/discord.module";
import { FrameController } from "./frame.controller";
import { FrameService } from "./frame.service";

@Module({
  imports: [CanvasModule, DiscordModule],
  controllers: [FrameController],
  providers: [FrameService],
  exports: [FrameService],
})
export class FrameModule {}
