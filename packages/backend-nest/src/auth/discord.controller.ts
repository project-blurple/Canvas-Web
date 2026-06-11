import {
  DiscordSnowflakeSchema,
  type DiscordUserProfile,
  GuildDataSchema,
} from "@blurple-canvas-web/types";
import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { SessionData } from "express-session";
import { createZodDto, ZodResponse } from "nestjs-zod";
import passport from "passport";
import { z } from "zod";

import { LoggedInGuard } from "@/auth/guards/logged-in.guard";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { type AppConfig, appConfig } from "@/config/app.config";
import { type SessionConfig, sessionConfig } from "@/config/session.config";
import { DISCORD_STRATEGY_NAME } from "@/discord/discord.constants";
import { DiscordGuildService } from "@/discord/discord-guild.service";
import { DiscordProfileService } from "@/discord/discord-profile.service";
import { DiscordTokenService } from "@/discord/discord-token.service";

class GuildIdParamsDto extends createZodDto(
  z.object({ guildId: DiscordSnowflakeSchema }),
) {}

class GuildPermissionsResponseDto extends createZodDto(
  z.object({ administrator: z.boolean(), manage_guild: z.boolean() }),
) {}

const GuildsResponseSchema = z.object({
  guilds: z.record(z.string(), GuildDataSchema),
});

class GuildsResponseDto extends createZodDto(GuildsResponseSchema) {}

@Controller("discord")
export class DiscordController {
  constructor(
    @Inject(appConfig.KEY) private readonly appCfg: AppConfig,
    @Inject(sessionConfig.KEY) private readonly sessionCfg: SessionConfig,
    private readonly discordProfileService: DiscordProfileService,
    private readonly discordGuildService: DiscordGuildService,
    private readonly discordTokenService: DiscordTokenService,
  ) {}

  @Get()
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.authenticate(req, res);
  }

  @Get("callback")
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.authenticate(req, res, {
      failureRedirect: `${this.appCfg.frontendUrl}/signin`,
    });

    // Passport already responded (e.g. redirected to the failure page).
    if (res.headersSent) return;

    if (!req.user) {
      throw new UnauthorizedError("User is not authenticated");
    }
    const discordProfile: DiscordUserProfile = req.user;
    const authInfo = req.authInfo as Partial<SessionData> | undefined;

    if (authInfo?.discordAccessToken) {
      req.session.discordAccessToken = authInfo.discordAccessToken;
      req.session.discordRefreshToken = authInfo.discordRefreshToken;
      req.session.discordTokenExpiresAt = authInfo.discordTokenExpiresAt;
      req.session.discordTokenLifetimeMs = authInfo.discordTokenLifetimeMs;
      req.session.discordGuildFlags = authInfo.discordGuildFlags;
      req.session.discordGuildFlagsFetchedAt =
        authInfo.discordGuildFlagsFetchedAt ?? Date.now();
    }

    res.cookie("profile", JSON.stringify(discordProfile), {
      httpOnly: false, // Allow the frontend to read the cookie
      secure: this.sessionCfg.secureCookies,
    });

    await this.discordProfileService.saveDiscordProfile(discordProfile);

    res.redirect(this.appCfg.frontendUrl);

    await this.discordGuildService.syncDiscordGuildRecords(
      authInfo?.discordGuildFlags,
    );
  }

  @Get("guilds/:guildId/permissions")
  @UseGuards(LoggedInGuard)
  @ZodResponse({ type: GuildPermissionsResponseDto })
  async guildPermissions(
    @Param() params: GuildIdParamsDto,
    @Req() req: Request,
  ) {
    return await this.discordTokenService.withDiscordAccessToken(
      req.session,
      (accessToken) =>
        this.discordGuildService.getGuildPermissionsForUser(
          params.guildId,
          accessToken,
        ),
    );
  }

  @Get("guilds/permissions-map")
  @UseGuards(LoggedInGuard)
  @ZodResponse({ type: GuildsResponseDto })
  async guildPermissionsMap(@Req() req: Request) {
    const guildFlags = await this.discordTokenService.withDiscordAccessToken(
      req.session,
      (accessToken) =>
        this.discordGuildService.getCachedUserGuildFlags(
          req.session,
          accessToken,
        ),
    );

    req.session.discordGuildFlags = guildFlags;

    return { guilds: guildFlags };
  }

  // TODO: ratelimiting
  @Post("guilds/refresh")
  @UseGuards(LoggedInGuard)
  async refreshGuilds(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const guildFlags = await this.discordTokenService.withDiscordAccessToken(
      req.session,
      (accessToken) =>
        this.discordGuildService.refreshCachedUserGuildFlags(
          req.session,
          accessToken,
        ),
    );

    // Respond before the guild-record sync so the DB writes don't add
    // latency, mirroring the old route.
    res
      .status(200)
      .json({ guilds: guildFlags } satisfies z.infer<
        typeof GuildsResponseSchema
      >);

    await this.discordGuildService.syncDiscordGuildRecords(guildFlags);
  }

  /**
   * Delete the active session associated with the user. This will invalidate
   * the existing session cookie.
   */
  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      req.logout((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Runs `passport.authenticate` inside the Nest pipeline so strategy errors
   * surface as exceptions to the global filter (same envelope as the old
   * backend's `errorHandler`).
   */
  private authenticate(
    req: Request,
    res: Response,
    options: passport.AuthenticateOptions = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Passport may end the response itself (OAuth redirect, failure
      // redirect); `next` is never called in that case.
      res.once("finish", () => resolve());

      const middleware = passport.authenticate(DISCORD_STRATEGY_NAME, options);
      middleware(req, res, (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
