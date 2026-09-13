import { Module } from "@nestjs/common";

import { DiscordController } from "@/auth/discord.controller";
import { DiscordStrategyService } from "@/auth/discord.strategy";
import { SessionStoreService } from "@/auth/session-store.service";
import { DiscordModule } from "@/discord/discord.module";

@Module({
  imports: [DiscordModule],
  controllers: [DiscordController],
  providers: [SessionStoreService, DiscordStrategyService],
  exports: [SessionStoreService],
})
export class AuthModule {}
