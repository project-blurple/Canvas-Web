import { Module } from "@nestjs/common";

import { BroadcastService } from "@/realtime/broadcast.service";
import { PixelResyncService } from "@/realtime/pixel-resync.service";
import { RealtimeGateway } from "@/realtime/realtime.gateway";

@Module({
  providers: [RealtimeGateway, BroadcastService, PixelResyncService],
  exports: [BroadcastService],
})
export class RealtimeModule {}
