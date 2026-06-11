import { Module } from "@nestjs/common";

import { DiscordProfileService } from "@/discord/discord-profile.service";

@Module({
  providers: [DiscordProfileService],
  exports: [DiscordProfileService],
})
export class DiscordModule {}
