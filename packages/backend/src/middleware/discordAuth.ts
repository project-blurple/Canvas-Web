import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import type { ConsumableAPI, DiscordProfile } from "discord-strategy";
import { DiscordScope, Strategy as DiscordStrategy } from "discord-strategy";
import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import refresh from "passport-oauth2-refresh";
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
    clientID: config.discord.clientId,
    clientSecret: config.discord.clientSecret,
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
        discordGuildFlags: Awaited<ReturnType<typeof getCurrentUserGuildFlags>>;
      },
    ) => void,
    _consume: ConsumableAPI,
  ) => {
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
          profile.avatar ?? null,
        ),
        isCanvasAdmin: userIsCanvasAdmin,
        isCanvasModerator: userIsCanvasAdmin || userIsCanvasModerator,
      };

      done(null, user, {
        discordAccessToken: accessToken,
        discordRefreshToken: refreshToken,
        discordGuildFlags: userGuildFlags,
      });
    } catch (error) {
      done(error as Error, undefined);
    }
  },
);

export function initializeAuth(app: Express) {
  passport.use(discordStrategy);
  refresh.use(discordStrategy as never);

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
