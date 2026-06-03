import config from "@/config";
import { ForbiddenError } from "@/errors";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerificationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(token: string): Promise<void> {
  if (!config.turnstileSecretKey) {
    throw new ForbiddenError("Turnstile is not configured");
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret: config.turnstileSecretKey,
      response: token,
    }),
  });

  if (!response.ok) {
    throw new ForbiddenError("Turnstile verification failed");
  }

  const payload = (await response.json()) as TurnstileVerificationResponse;
  if (!payload.success) {
    throw new ForbiddenError("Turnstile verification failed");
  }
}
