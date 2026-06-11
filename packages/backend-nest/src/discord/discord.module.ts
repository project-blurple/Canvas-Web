import { Module } from "@nestjs/common";

import { DiscordProfileService } from "@/discord/discord-profile.service";
import { DiscordTokenService } from "@/discord/discord-token.service";

@Module({
  providers: [DiscordProfileService, DiscordTokenService],
  exports: [DiscordProfileService, DiscordTokenService],
})
export class DiscordModule {}
