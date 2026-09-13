import dotenvx from "@dotenvx/dotenvx";
import { z } from "zod";

// Load .env via dotenvx (workspace standard) once, at first import — before
// @nestjs/config evaluates `validate` or any registerAs factory.
if (!process.env.VITEST) {
  dotenvx.config({ ignore: ["MISSING_ENV_FILE"], quiet: true });
}

const requiredString = z.string().min(1);

export const envSchema = z.object({
  DATABASE_URL: requiredString,
  DISCORD_CLIENT_ID: requiredString,
  DISCORD_CLIENT_SECRET: requiredString,
  NODE_ENV: requiredString.default("production"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  FRONTEND_URL: requiredString.default("http://localhost:3000"),
  OTEL_SERVICE_NAME: requiredString.default("canvas-backend"),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: requiredString.default(
    "http://localhost:4318/v1/traces",
  ),
  // Having a random secret would mess with persistent sessions.
  EXPRESS_SESSION_SECRET: requiredString.default(
    "change the secret in production",
  ),
  DISCORD_MANAGEMENT_GUILD_ID: requiredString.optional(),
  DISCORD_ADMIN_ROLE_ID: requiredString.optional(),
  DISCORD_MODERATOR_ROLE_ID: requiredString.optional(),
  WEB_PLACING_ENABLED: z.string().optional(),
  BOT_PLACING_ENABLED: z.string().optional(),
  BOT_API_KEY: requiredString.optional(),
  MAX_USER_FRAMES_ALLOWED: z.coerce.number().int().positive().default(32),
  MAX_GUILD_FRAMES_ALLOWED: z.coerce.number().int().positive().default(32),
  CAPTCHA_ENABLED: z.string().optional(),
  TURNSTILE_SECRET_KEY: requiredString.optional(),
  DISCORD_SERVER_INVITE: requiredString.optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates the environment. The old backend treated empty env vars as unset
 * (`process.env.X || default`); filtering them out before parsing preserves
 * that behaviour.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const withoutEmpty = Object.fromEntries(
    Object.entries(raw).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );

  const parsed = envSchema.safeParse(withoutEmpty);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n  ");
    throw new Error(`Invalid environment configuration:\n  ${details}`);
  }

  return parsed.data;
}
