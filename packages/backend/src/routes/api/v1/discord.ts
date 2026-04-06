import { DiscordUserProfile } from "@blurple-canvas-web/types";
import { Router } from "express";
import passport from "passport";

import config from "@/config";
import { saveDiscordProfile } from "@/services/discordProfileService";

export const discordRouter = Router();

discordRouter.get("/", passport.authenticate("discord"));

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
