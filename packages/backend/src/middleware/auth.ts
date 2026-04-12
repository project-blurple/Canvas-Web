import { DiscordUserProfile } from "@blurple-canvas-web/types";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import { prisma } from "@/client";
import config from "@/config";
import {
  isCanvasAdmin,
  isCanvasModerator,
} from "@/services/discordGuildService";
import { getProfilePictureUrlFromHash } from "@/services/discordProfileService";

const discordStrategy = new DiscordStrategy(
  {
    clientID: config.discord.clientId,
    clientSecret: config.discord.clientSecret,
    callbackURL: "/api/v1/discord/callback",
    scope: ["identify", "guilds"],
  },
  async (_accessToken, _refreshToken, profile, done) => {
    const guildIds = profile.guilds?.map((guild) => BigInt(guild.id)) ?? [];

    try {
      const filteredGuildIds = await prisma.guild.findMany({
        select: { id: true },
        where: { id: { in: guildIds } },
      });

      const guildString = filteredGuildIds.map((guild) => guild.id).join(" ");
      const guildStringBase64 = Buffer.from(guildString).toString("base64");
      const [userIsCanvasAdmin, userIsCanvasModerator] = await Promise.all([
        isCanvasAdmin(profile.id),
        isCanvasModerator(profile.id),
      ]);

      const user: DiscordUserProfile = {
        id: profile.id,
        username: profile.username,
        profilePictureUrl: getProfilePictureUrlFromHash(
          BigInt(profile.id),
          profile.avatar,
        ),
        guildIdsBase64: guildStringBase64,
        isCanvasAdmin: userIsCanvasAdmin,
        isCanvasModerator: userIsCanvasModerator,
      };

      done(null, user);
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
