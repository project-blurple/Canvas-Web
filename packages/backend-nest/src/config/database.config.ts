import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

export const databaseConfig = registerAs(ConfigNamespace.Database, () => {
  const env = validateEnv(process.env);

  return {
    url: env.DATABASE_URL,
  };
});

export type DatabaseConfig = ConfigType<typeof databaseConfig>;
