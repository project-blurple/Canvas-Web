import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

export const placementConfig = registerAs(ConfigNamespace.Placement, () => {
  const env = validateEnv(process.env);

  return {
    /**
     * Placed pixels are typically attributed to guilds they were placed in.
     * Identify pixels placed through the web with the ID of 0.
     */
    webGuildId: 0,
    webPlacingEnabled: env.WEB_PLACING_ENABLED === "true",
    // Keep bot placing enabled by default unless explicitly disabled.
    botPlacingEnabled: env.BOT_PLACING_ENABLED !== "false",
    botApiKey: env.BOT_API_KEY,
  };
});

export type PlacementConfig = ConfigType<typeof placementConfig>;
