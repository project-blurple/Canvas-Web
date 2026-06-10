import fs from "node:fs";
import path from "node:path";
import { Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

const logger = new Logger("AppConfig");

export const appConfig = registerAs(ConfigNamespace.App, () => {
  const env = validateEnv(process.env);

  const paths = {
    root: path.resolve(),
    canvases: path.resolve("static", "canvas"),
  };

  logger.debug(`Creating canvases directory at ${paths.canvases}`);
  fs.mkdirSync(paths.canvases, { recursive: true });

  return {
    environment: env.NODE_ENV,
    port: env.PORT,
    frontendUrl: env.FRONTEND_URL,
    paths,
  };
});

export type AppConfig = ConfigType<typeof appConfig>;
