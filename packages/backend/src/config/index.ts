import fs from "node:fs";
import path from "node:path";
import dotenvx from "@dotenvx/dotenvx";

dotenvx.config();

function requiredEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable is missing: ${key}`);
  }

  return value;
}

function parseBooleanEnv(value: string | undefined): boolean {
  return value === "true";
}

function parseCanvasAllowlistEnv(value: string | undefined): number[] {
  if (!value) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid SNAPSHOTS_AVAILABLE_FOR_CANVASES value: ${value}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      "SNAPSHOTS_AVAILABLE_FOR_CANVASES must be a JSON array of canvas ids",
    );
  }

  const canvasIds = new Set<number>();
  for (const entry of parsed) {
    if (typeof entry !== "number" || !Number.isInteger(entry) || entry <= 0) {
      throw new Error(
        "SNAPSHOTS_AVAILABLE_FOR_CANVASES must contain only positive integer canvas ids",
      );
    }

    canvasIds.add(entry);
  }

  return [...canvasIds];
}

const config = {
  /**
   * In development mode, secure cookies are not used for sending the profile. This is because
   * they can't be accessed over HTTP on Safari.
   */
  environment: process.env.NODE_ENV || "production",
  api: {
    port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 8000,
  },
  snapshot: {
    generateSnapshots: parseBooleanEnv(process.env.GENERATE_SNAPSHOTS),
    availableForCanvases: parseCanvasAllowlistEnv(
      process.env.SNAPSHOTS_AVAILABLE_FOR_CANVASES,
    ),
    schedulerIntervalMs:
      process.env.SNAPSHOT_SCHEDULER_INTERVAL_MS ?
        Number.parseInt(process.env.SNAPSHOT_SCHEDULER_INTERVAL_MS, 10)
      : 60_000,
  },
  paths: {
    root: path.resolve(),
    canvases: path.resolve("static", "canvas"),
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  tracing: {
    serviceName: process.env.OTEL_SERVICE_NAME || "canvas-backend",
    otlpTracesEndpoint:
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      "http://localhost:4318/v1/traces",
  },
  // having a random secret would mess with persistent sessions
  expressSessionSecret:
    process.env.EXPRESS_SESSION_SECRET || "change the secret in production",
  discord: {
    clientId: requiredEnv("DISCORD_CLIENT_ID"),
    clientSecret: requiredEnv("DISCORD_CLIENT_SECRET"),
    discordAdminRole: process.env.DISCORD_ADMIN_ROLE_ID,
    discordManagementGuild: process.env.DISCORD_MANAGEMENT_GUILD_ID,
    discordModeratorRole: process.env.DISCORD_MODERATOR_ROLE_ID,
  },
  /**
   * Placed pixels are typically attributed to guilds they were place in.
   * Identify pixels placed through the web with the ID of 0.
   */
  webGuildId: 0,
  webPlacingEnabled: process.env.WEB_PLACING_ENABLED === "true",
  // Keep bot placing enabled by default unless explicitly disabled.
  botPlacingEnabled: process.env.BOT_PLACING_ENABLED !== "false",
  frames: {
    maxAllowedUser:
      process.env.MAX_USER_FRAMES_ALLOWED ?
        Number.parseInt(process.env.MAX_USER_FRAMES_ALLOWED, 10)
      : 32,
    maxAllowedGuild:
      process.env.MAX_GUILD_FRAMES_ALLOWED ?
        Number.parseInt(process.env.MAX_GUILD_FRAMES_ALLOWED, 10)
      : 32,
  },
  discordServerInvite: process.env.DISCORD_SERVER_INVITE,
  botApiKey: process.env.BOT_API_KEY,
  captchaEnabled: process.env.CAPTCHA_ENABLED === "true",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
  databaseUrl: requiredEnv("DATABASE_URL"),
} as const;

if (!fs.existsSync(config.paths.canvases)) {
  console.debug(`Creating canvases directory at ${config.paths.canvases}`);
  fs.mkdirSync(config.paths.canvases, { recursive: true });
}

export default config;
