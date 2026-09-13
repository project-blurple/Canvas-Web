import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

export const framesConfig = registerAs(ConfigNamespace.Frames, () => {
  const env = validateEnv(process.env);

  return {
    maxAllowedUser: env.MAX_USER_FRAMES_ALLOWED,
    maxAllowedGuild: env.MAX_GUILD_FRAMES_ALLOWED,
  };
});

export type FramesConfig = ConfigType<typeof framesConfig>;
