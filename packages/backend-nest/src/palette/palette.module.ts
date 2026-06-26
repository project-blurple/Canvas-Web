import { Module } from "@nestjs/common";

import { CanvasAdminGuard } from "@/auth/guards/canvas-admin.guard";
import { DiscordModule } from "@/discord/discord.module";
import { EventModule } from "@/event/event.module";
import { PaletteController } from "./palette.controller";
import { PaletteService } from "./palette.service";

@Module({
  imports: [DiscordModule, EventModule],
  controllers: [PaletteController],
  providers: [PaletteService, CanvasAdminGuard],
  exports: [PaletteService],
})
export class PaletteModule {}
