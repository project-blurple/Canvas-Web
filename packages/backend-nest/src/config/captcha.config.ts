import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

export const captchaConfig = registerAs(ConfigNamespace.Captcha, () => {
  const env = validateEnv(process.env);

  return {
    enabled: env.CAPTCHA_ENABLED === "true",
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY,
  };
});

export type CaptchaConfig = ConfigType<typeof captchaConfig>;
