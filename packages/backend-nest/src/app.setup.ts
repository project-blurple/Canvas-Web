import "@/common/bigint-json";

import { VersioningType } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { configureSession } from "@/auth/session.setup";
import { type AppConfig, appConfig } from "@/config/app.config";

/**
 * Process-level Express settings shared by `main.ts` and the e2e test harness,
 * mirroring the old backend's `createApp()`.
 */
export function configureApp(
  app: NestExpressApplication,
): NestExpressApplication {
  const { frontendUrl } = app.get<AppConfig>(appConfig.KEY);

  // The app runs behind a single proxy hop (Caddy) and reads client IPs
  // from X-Forwarded-For.
  app.set("trust proxy", 1);
  app.enableCors({ origin: frontendUrl, credentials: true });

  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  configureSession(app);

  return app;
}
