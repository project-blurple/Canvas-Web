import { Module } from "@nestjs/common";

import { CanvasModule } from "@/canvas/canvas.module";
import { DiscordModule } from "@/discord/discord.module";
import { TimelapseModule } from "@/timelapse/timelapse.module";
import { FrameController } from "./frame.controller";
import { FrameService } from "./frame.service";

@Module({
  imports: [CanvasModule, DiscordModule, TimelapseModule],
  controllers: [FrameController],
  providers: [FrameService],
  exports: [FrameService],
})
export class FrameModule {}
