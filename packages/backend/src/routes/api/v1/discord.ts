import type { DiscordUserProfile, GuildData } from "@blurple-canvas-web/types";
import { Router } from "express";
import passport from "passport";

import config from "@/config";
import { UnauthorizedError } from "@/errors";
import ApiError from "@/errors/ApiError";
import {
  getCurrentUserGuildFlags,
  getGuildPermissionsForUser,
  syncDiscordGuildRecords,
} from "@/services/discordGuildService";
import { saveDiscordProfile } from "@/services/discordProfileService";
import { assertIsSnowflake } from "@/utils/discordRouteUtils";

export const discordRouter = Router();

discordRouter.get("/", passport.authenticate("discord"));

discordRouter.get("/guilds/:guildId/permissions", async (req, res) => {
  try {
    const { guildId } = req.params;
    const profile = req.user as DiscordUserProfile;

    if (!profile?.id) {
      throw new UnauthorizedError("User is not authenticated");
    }

    assertIsSnowflake(guildId, "guildId");
    const accessToken = req.session.discordAccessToken;
    if (!accessToken) {
      throw new UnauthorizedError("Discord access token is missing");
    }

    const permissions = await getGuildPermissionsForUser(guildId, accessToken);

    res.status(200).json(permissions);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

discordRouter.get("/guilds/permissions-map", async (req, res) => {
  try {
    const profile = req.user as DiscordUserProfile;

    if (!profile?.id) {
      throw new UnauthorizedError("User is not authenticated");
    }

    const accessToken = req.session.discordAccessToken;
    if (!accessToken) {
      throw new UnauthorizedError("Discord access token is missing");
    }

    const guildFlags =
      req.session.discordGuildFlags ??
      (await getCurrentUserGuildFlags(accessToken));

    req.session.discordGuildFlags = guildFlags;

    res.status(200).json({
      guilds: guildFlags,
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
    const discordProfile = req.user as DiscordUserProfile;
    const authInfo = req.authInfo as
      | {
          discordAccessToken?: string;
          discordGuildFlags?: Record<string, GuildData>;
        }
      | undefined;

    if (authInfo?.discordAccessToken) {
      req.session.discordAccessToken = authInfo.discordAccessToken;
      req.session.discordGuildFlags = authInfo.discordGuildFlags;
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
