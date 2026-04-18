import { randomBytes, timingSafeEqual } from "node:crypto";
import { DiscordUserProfile } from "@blurple-canvas-web/types";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import { prisma } from "@/client";
import config from "@/config";
import { ForbiddenError } from "@/errors";
import {
  getCurrentUserGuildFlags,
  isCanvasAdmin,
  isCanvasModerator,
} from "@/services/discordGuildService";
import { getProfilePictureUrlFromHash } from "@/services/discordProfileService";

const csrfCookieName = "XSRF-TOKEN";
const csrfHeaderNames = ["x-xsrf-token", "x-csrf-token"];
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function getCsrfTokenFromRequest(req: Request) {
  for (const headerName of csrfHeaderNames) {
    const token = req.headers[headerName];

    if (typeof token === "string" && token.length > 0) {
      return token;
    }
  }

  return null;
}

function ensureCsrfProtection(req: Request, res: Response, next: NextFunction) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString("hex");
  }

  res.cookie(csrfCookieName, req.session.csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: config.environment !== "development",
    path: "/",
  });

  if (safeMethods.has(req.method)) {
    next();
    return;
  }

  const requestToken = getCsrfTokenFromRequest(req);
  if (!requestToken) {
    next(new ForbiddenError("Missing CSRF token"));
    return;
  }

  const sessionToken = req.session.csrfToken;
  const requestTokenBuffer = Buffer.from(requestToken);
  const sessionTokenBuffer = Buffer.from(sessionToken);

  if (
    requestTokenBuffer.length !== sessionTokenBuffer.length ||
    !timingSafeEqual(requestTokenBuffer, sessionTokenBuffer)
  ) {
    next(new ForbiddenError("Invalid CSRF token"));
    return;
  }

  next();
}

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
        isCanvasModerator: userIsCanvasModerator,
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
  app.use(ensureCsrfProtection);
}
