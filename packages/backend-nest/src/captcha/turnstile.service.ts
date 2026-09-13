import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { ForbiddenError } from "@/common/errors/forbidden.error";
import { type CaptchaConfig, captchaConfig } from "@/config/captcha.config";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerificationResponse {
  success: boolean;
  "error-codes"?: string[];
}

/** Verifies proof-of-humanity tokens before a protected action proceeds. */
export interface CaptchaVerifier {
  verify(token: string): Promise<void>;
}

/**
 * Cloudflare Turnstile implementation of {@link CaptchaVerifier}. No-op while
 * `CAPTCHA_ENABLED` is off, so it can be toggled on reactively (e.g. during a
 * bot raid) without a redeploy.
 */
@Injectable()
export class TurnstileService implements CaptchaVerifier, OnModuleInit {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(
    @Inject(captchaConfig.KEY) private readonly config: CaptchaConfig,
  ) {}

  /** Fail fast on a misconfigured deployment instead of at request time. */
  onModuleInit(): void {
    if (this.config.enabled && !this.config.turnstileSecretKey) {
      throw new Error(
        "CAPTCHA_ENABLED is true but TURNSTILE_SECRET_KEY is not set",
      );
    }
  }

  async verify(token: string): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (!this.config.turnstileSecretKey) {
      throw new ForbiddenError("Turnstile is not configured");
    }

    let response: Response;
    try {
      response = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: this.config.turnstileSecretKey,
          response: token,
        }),
      });
    } catch (error) {
      this.logger.error(`Turnstile siteverify request failed: ${error}`);
      throw new ForbiddenError("Turnstile verification failed");
    }

    if (!response.ok) {
      throw new ForbiddenError("Turnstile verification failed");
    }

    const payload = (await response.json()) as TurnstileVerificationResponse;
    if (!payload.success) {
      throw new ForbiddenError("Turnstile verification failed");
    }
  }
}
