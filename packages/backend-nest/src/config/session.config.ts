import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

export const sessionConfig = registerAs(ConfigNamespace.Session, () => {
  const env = validateEnv(process.env);

  return {
    secret: env.EXPRESS_SESSION_SECRET,
    /**
     * In development mode, secure cookies are not used for sending the profile.
     * This is because they can't be accessed over HTTP on Safari.
     */
    secureCookies: env.NODE_ENV !== "development",
  };
});

export type SessionConfig = ConfigType<typeof sessionConfig>;
