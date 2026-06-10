import fs from "node:fs";
import path from "node:path";
import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

export const appConfig = registerAs(ConfigNamespace.App, () => {
  const env = validateEnv(process.env);

  const paths = {
    root: path.resolve(),
    canvases: path.resolve("static", "canvas"),
  };

  if (!fs.existsSync(paths.canvases)) {
    console.debug(`Creating canvases directory at ${paths.canvases}`);
    fs.mkdirSync(paths.canvases, { recursive: true });
  }

  return {
    environment: env.NODE_ENV,
    port: env.PORT,
    frontendUrl: env.FRONTEND_URL,
    paths,
  };
});

export type AppConfig = ConfigType<typeof appConfig>;
