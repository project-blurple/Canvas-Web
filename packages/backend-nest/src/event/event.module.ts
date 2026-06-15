import { Module } from "@nestjs/common";

import { CanvasAdminGuard } from "@/auth/guards/canvas-admin.guard";
import { DiscordModule } from "@/discord/discord.module";
import { EventController } from "./event.controller";
import { EventService } from "./event.service";

@Module({
  imports: [DiscordModule],
  controllers: [EventController],
  providers: [EventService, CanvasAdminGuard],
  exports: [EventService],
})
export class EventModule {}
