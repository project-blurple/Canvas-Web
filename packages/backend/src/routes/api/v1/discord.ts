import { DiscordUserProfile } from "@blurple-canvas-web/types";
import { Router } from "express";
import passport from "passport";

import config from "@/config";
import { UnauthorizedError } from "@/errors";
import ApiError from "@/errors/ApiError";
import { getGuildPermissionsForUser } from "@/services/discordGuildService";
import { saveDiscordProfile } from "@/services/discordProfileService";
import {
  getDiscordBotToken,
  validateSnowflake,
} from "@/utils/discordRouteUtils";

export const discordRouter = Router();

discordRouter.get("/", passport.authenticate("discord"));

discordRouter.get("/guilds/:guildId/permissions", async (req, res) => {
  try {
    const { guildId } = req.params;
    const profile = req.user as DiscordUserProfile;

    if (!profile?.id) {
      throw new UnauthorizedError("User is not authenticated");
    }

    validateSnowflake(guildId, "guildId");
    validateSnowflake(profile.id, "userId");

    const permissions = await getGuildPermissionsForUser(
      guildId,
      profile.id,
      getDiscordBotToken(),
    );

    res.status(200).json(permissions);
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
  (req, res) => {
    const discordProfile = req.user as DiscordUserProfile;

    res.cookie("profile", JSON.stringify(discordProfile), {
      httpOnly: false, // Allow the frontend to read the cookie
      secure: config.environment !== "development",
    });

    saveDiscordProfile(discordProfile);
    res.redirect(config.frontendUrl);
  },
);
