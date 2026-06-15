import { Module } from "@nestjs/common";

import { CanvasAdminGuard } from "@/auth/guards/canvas-admin.guard";
import { DiscordModule } from "@/discord/discord.module";
import { RealtimeModule } from "@/realtime/realtime.module";
import { NoticeController } from "./notice.controller";
import { NoticeService } from "./notice.service";

@Module({
  imports: [DiscordModule, RealtimeModule],
  controllers: [NoticeController],
  providers: [NoticeService, CanvasAdminGuard],
  exports: [NoticeService],
})
export class NoticeModule {}
