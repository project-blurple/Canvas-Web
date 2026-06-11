import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { Inject, Injectable } from "@nestjs/common";
import type { ConsumableAPI, DiscordProfile } from "discord-strategy";
import { DiscordScope, Strategy as DiscordStrategy } from "discord-strategy";
import passport from "passport";
import refresh from "passport-oauth2-refresh";

import { type DiscordConfig, discordConfig } from "@/config/discord.config";
import { DiscordGuildService } from "@/discord/discord-guild.service";
import { DiscordProfileService } from "@/discord/discord-profile.service";

@Injectable()
export class DiscordStrategyService {
  readonly strategy: DiscordStrategy;

  constructor(
    @Inject(discordConfig.KEY) config: DiscordConfig,
    discordGuildService: DiscordGuildService,
    discordProfileService: DiscordProfileService,
  ) {
    this.strategy = new DiscordStrategy(
      {
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        authorizationURL: "https://discord.com/api/oauth2/authorize",
        callbackURL: "/api/v1/discord/callback",
        tokenURL: "https://discord.com/api/oauth2/token",
        scope: [
          DiscordScope.Identify,
          DiscordScope.Guilds,
          DiscordScope.GuildsMembersRead,
        ],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: DiscordProfile,
        done: (
          error: Error | null,
          user?: DiscordUserProfile,
          info?: {
            discordAccessToken: string;
            discordRefreshToken: string;
            discordGuildFlags: Awaited<
              ReturnType<DiscordGuildService["getCurrentUserGuildFlags"]>
            >;
            discordGuildFlagsFetchedAt: number;
          },
        ) => void,
        _consume: ConsumableAPI,
      ) => {
        try {
          const userGuildFlags =
            await discordGuildService.getCurrentUserGuildFlags(accessToken);
          const [userIsCanvasAdmin, userIsCanvasModerator] = await Promise.all([
            discordGuildService.isCanvasAdmin(accessToken),
            discordGuildService.isCanvasModerator(accessToken),
          ]);

          const user: DiscordUserProfile = {
            id: profile.id,
            username: profile.username,
            profilePictureUrl:
              discordProfileService.getProfilePictureUrlFromHash(
                BigInt(profile.id),
                profile.avatar ?? null,
              ),
            isCanvasAdmin: userIsCanvasAdmin,
            isCanvasModerator: userIsCanvasAdmin || userIsCanvasModerator,
          };

          done(null, user, {
            discordAccessToken: accessToken,
            discordRefreshToken: refreshToken,
            discordGuildFlags: userGuildFlags,
            discordGuildFlagsFetchedAt: Date.now(),
          });
        } catch (error) {
          done(error as Error, undefined);
        }
      },
    );

    passport.use(this.strategy);
    refresh.use(this.strategy as never);
  }
}
