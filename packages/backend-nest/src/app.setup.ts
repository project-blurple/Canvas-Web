import "@/common/bigint-json";

import type { NestExpressApplication } from "@nestjs/platform-express";
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

  return app;
}
