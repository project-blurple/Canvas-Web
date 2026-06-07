import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { Router } from "express";
import type { SessionData } from "express-session";
import passport from "passport";

import config from "@/config";
import { UnauthorizedError } from "@/errors";
import ApiError from "@/errors/ApiError";
import { assertLoggedIn } from "@/middleware/canvasAuth";
import { guildRefreshLimiter } from "@/middleware/ratelimit";
import {
  getCachedUserGuildFlags,
  getGuildPermissionsForUser,
  refreshCachedUserGuildFlags,
  syncDiscordGuildRecords,
} from "@/services/discordGuildService";
import { saveDiscordProfile } from "@/services/discordProfileService";
import { withDiscordAccessToken } from "@/services/discordTokenService";
import { assertIsSnowflake } from "@/utils/discordRouteUtils";
import { addSpanAttributes } from "@/utils/otel";

export const discordRouter = Router();

discordRouter.get("/", passport.authenticate("discord"));

discordRouter.get("/guilds/:guildId/permissions", async (req, res) => {
  const { guildId } = req.params;
  addSpanAttributes(req, {
    "guild.id": guildId,
  });

  assertLoggedIn(req);

  assertIsSnowflake(guildId, "guildId");
  const permissions = await withDiscordAccessToken(req.session, (accessToken) =>
    getGuildPermissionsForUser(guildId, accessToken),
  );

  res.status(200).json(permissions);
});

discordRouter.get("/guilds/permissions-map", async (req, res) => {
  assertLoggedIn(req);

  const guildFlags = await withDiscordAccessToken(req.session, (accessToken) =>
    getCachedUserGuildFlags(req.session, accessToken),
  );

  req.session.discordGuildFlags = guildFlags;

  res.status(200).json({
    guilds: guildFlags,
  });

  addSpanAttributes(req, {
    "response.size": Object.keys(guildFlags).length,
  });
});

discordRouter.post("/guilds/refresh", guildRefreshLimiter, async (req, res) => {
  try {
    assertLoggedIn(req);

    const guildFlags = await withDiscordAccessToken(
      req.session,
      (accessToken) => refreshCachedUserGuildFlags(req.session, accessToken),
    );

    res.status(200).json({
      guilds: guildFlags,
    });

    await syncDiscordGuildRecords(guildFlags);

    addSpanAttributes(req, {
      "response.size": Object.keys(guildFlags).length,
    });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

/**
 * Delete the active session associated with the user. This will invalidate the existing session
 * cookie.
 */
discordRouter.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.status(204).end();
  });
});

discordRouter.get(
  "/callback",
  passport.authenticate("discord", {
    failureRedirect: `${config.frontendUrl}/signin`,
  }),
  async (req, res) => {
    if (!req.user) {
      throw new UnauthorizedError("User is not authenticated");
    }
    const discordProfile = req.user as DiscordUserProfile;
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
      secure: config.environment !== "development",
    });

    await saveDiscordProfile(discordProfile);

    res.redirect(config.frontendUrl);

    await syncDiscordGuildRecords(authInfo?.discordGuildFlags);
  },
);
