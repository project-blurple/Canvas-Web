import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import { prisma } from "@/client";
import config from "@/config";
import {
  getCurrentUserGuildFlags,
  isCanvasAdmin,
  isCanvasModerator,
} from "@/services/discordGuildService";
import { getProfilePictureUrlFromHash } from "@/services/discordProfileService";

const discordStrategy = new DiscordStrategy(
  {
    passReqToCallback: true,
    clientID: config.discord.clientId,
    clientSecret: config.discord.clientSecret,
    callbackURL: "/api/v1/discord/callback",
    scope: ["identify", "guilds", "guilds.members.read"],
  },
  async (_req, accessToken, _refreshToken, profile, done) => {
    try {
      const userGuildFlags = await getCurrentUserGuildFlags(accessToken);
      const [userIsCanvasAdmin, userIsCanvasModerator] = await Promise.all([
        isCanvasAdmin(accessToken),
        isCanvasModerator(accessToken),
      ]);

      const user: DiscordUserProfile = {
        id: profile.id,
        username: profile.username,
        profilePictureUrl: getProfilePictureUrlFromHash(
          BigInt(profile.id),
          profile.avatar,
        ),
        isCanvasAdmin: userIsCanvasAdmin,
        isCanvasModerator: userIsCanvasAdmin || userIsCanvasModerator,
      };

      done(null, user, {
        discordAccessToken: accessToken,
        discordGuildFlags: userGuildFlags,
      });
    } catch (error) {
      done(error as Error, undefined);
    }
  },
);

export function initializeAuth(app: Express) {
  passport.use(discordStrategy);

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser<DiscordUserProfile>((user, done) => {
    done(null, user);
  });

  app.use(
    session({
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day (in ms)
      },
      // having a random secret would mess with persistent sessions
      secret: config.expressSessionSecret,
      resave: true,
      saveUninitialized: false,
      store: new PrismaSessionStore(prisma, {
        checkPeriod: 2 * 60 * 1000, //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());
}
