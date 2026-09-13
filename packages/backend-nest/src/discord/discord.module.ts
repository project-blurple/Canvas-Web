import { Module } from "@nestjs/common";

import { DiscordGuildService } from "@/discord/discord-guild.service";
import { DiscordProfileService } from "@/discord/discord-profile.service";
import { DiscordTokenService } from "@/discord/discord-token.service";

@Module({
  providers: [DiscordGuildService, DiscordProfileService, DiscordTokenService],
  exports: [DiscordGuildService, DiscordProfileService, DiscordTokenService],
})
export class DiscordModule {}
