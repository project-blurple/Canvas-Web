import type { NestExpressApplication } from "@nestjs/platform-express";
import session from "express-session";
import passport from "passport";

import { SessionStoreService } from "@/auth/session-store.service";
import { type SessionConfig, sessionConfig } from "@/config/session.config";

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

export function configureSession(app: NestExpressApplication): void {
  const { secret } = app.get<SessionConfig>(sessionConfig.KEY);
  const { store } = app.get(SessionStoreService);

  app.use(
    session({
      cookie: {
        maxAge: SESSION_MAX_AGE_MS,
      },
      // having a random secret would mess with persistent sessions
      secret,
      resave: true,
      saveUninitialized: false,
      store,
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // The whole profile lives in the session; deserializing never hits the DB.
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser<Express.User>((user, done) => {
    done(null, user);
  });
}
