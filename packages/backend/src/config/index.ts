import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function requiredEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable is missing: ${key}`);
  }

  return value;
}

const config = {
  /**
   * In development mode, secure cookies are not used for sending the profile. This is because
   * they can't be accessed over HTTP on Safari.
   */
  environment: process.env.NODE_ENV || "production",
  api: {
    port: Number(process.env.PORT || 8000),
  },
  paths: {
    root: path.resolve(),
    canvases: path.resolve("static", "canvas"),
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  // having a random secret would mess with persistent sessions
  expressSessionSecret:
    process.env.EXPRESS_SESSION_SECRET || "change the secret in production",
  discord: {
    clientId: requiredEnv("DISCORD_CLIENT_ID"),
    clientSecret: requiredEnv("DISCORD_CLIENT_SECRET"),
  },
  /**
   * Placed pixels are typically attributed to guilds they were place in.
   * Identify pixels placed through the web with the ID of 0.
   */
  webGuildId: 0,
  webPlacingEnabled: process.env.WEB_PLACING_ENABLED === "true",
  allColorsGlobal: process.env.ALL_COLORS_GLOBAL === "true",
  discordServerInvite: process.env.DISCORD_SERVER_INVITE,
  botApiKey: process.env.BOT_API_KEY,
} as const;

if (!fs.existsSync(config.paths.canvases)) {
  console.debug(`Creating canvases directory at ${config.paths.canvases}`);
  fs.mkdirSync(config.paths.canvases, { recursive: true });
}

export default config;
