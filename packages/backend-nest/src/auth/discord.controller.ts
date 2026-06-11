import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { Controller, Get, HttpCode, Inject, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { SessionData } from "express-session";
import passport from "passport";

import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { type AppConfig, appConfig } from "@/config/app.config";
import { type SessionConfig, sessionConfig } from "@/config/session.config";
import { DiscordGuildService } from "@/discord/discord-guild.service";
import { DiscordProfileService } from "@/discord/discord-profile.service";
import { DISCORD_STRATEGY_NAME } from "@/discord/discord.constants";

@Controller("discord")
export class DiscordController {
  constructor(
    @Inject(appConfig.KEY) private readonly appCfg: AppConfig,
    @Inject(sessionConfig.KEY) private readonly sessionCfg: SessionConfig,
    private readonly discordProfileService: DiscordProfileService,
    private readonly discordGuildService: DiscordGuildService,
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
