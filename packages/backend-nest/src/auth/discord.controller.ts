import {
  DiscordSnowflakeSchema,
  type DiscordUserProfile,
  GuildDataSchema,
} from "@blurple-canvas-web/types";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiFoundResponse,
  ApiNoContentResponse,
  ApiOperation,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import type { SessionData } from "express-session";
import { createZodDto, ZodResponse } from "nestjs-zod";
import passport from "passport";
import { z } from "zod";

import { RequiresLogin } from "@/auth/require-auth.decorator";
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
  private readonly logger = new Logger(DiscordController.name);

  constructor(
    @Inject(appConfig.KEY) private readonly appCfg: AppConfig,
    @Inject(sessionConfig.KEY) private readonly sessionCfg: SessionConfig,
    private readonly discordProfileService: DiscordProfileService,
    private readonly discordGuildService: DiscordGuildService,
    private readonly discordTokenService: DiscordTokenService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({
    summary: "Log in with Discord",
    description:
      "Starts the Discord OAuth flow. Open this URL in a browser (not via " +
      "“Try it out”) to log in and receive a session cookie.",
  })
  @ApiFoundResponse({ description: "Redirect to Discord's consent screen" })
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.authenticate(req, res);
  }

  @Get("callback")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({
    summary: "Discord OAuth callback",
    description:
      "Completes the OAuth flow: stores the Discord tokens in the session, " +
      "sets the `connect.sid` and `profile` cookies, and redirects to the " +
      "frontend. Called by Discord, not directly.",
  })
  @ApiFoundResponse({
    description: "Redirect to the frontend (or its sign-in page on failure)",
  })
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
  @RequiresLogin()
  @ApiOperation({ summary: "Get the user's permissions for a guild" })
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
  @RequiresLogin()
  @ApiOperation({
    summary: "Get the cached permission flags for all of the user's guilds",
  })
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
  @RequiresLogin()
  @ApiOperation({
    summary: "Refresh the cached guild permission flags from Discord",
  })
  @ZodResponse({ status: HttpStatus.OK, type: GuildsResponseDto })
  async refreshGuilds(@Req() req: Request): Promise<GuildsResponseDto> {
    const guildFlags = await this.discordTokenService.withDiscordAccessToken(
      req.session,
      (accessToken) =>
        this.discordGuildService.refreshCachedUserGuildFlags(
          req.session,
          accessToken,
        ),
    );

    this.discordGuildService
      .syncDiscordGuildRecords(guildFlags)
      .catch((error) => {
        this.logger.error(`Failed to sync guild records: ${error}`);
      });

    return { guilds: guildFlags };
  }

  /**
   * Delete the active session associated with the user. This will invalidate
   * the existing session cookie.
   */
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Log out" })
  @ApiNoContentResponse({ description: "Session invalidated" })
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
