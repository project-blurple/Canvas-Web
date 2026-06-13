import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import type { Request } from "express";
import rateLimit from "express-rate-limit";

// Makes sure we are rate limiting the first IP address (user's IP) in the X-Forwarded-For header.
// If not present, use the request's IP address.
const ipKeyGenerator = (req: Request) => {
  const clientIp = req.headers["x-forwarded-for"];
  if (clientIp) {
    if (typeof clientIp === "string") {
      return clientIp;
    }
    return clientIp[0];
  }
  return req.ip ?? "";
};

// User-based key generator (assumes authenticated user has req.user.id)
const userKeyGenerator = (req: Request) => {
  const user = req.user as DiscordUserProfile | undefined;
  if (user?.id) {
    return `user-${user.id}`;
  }
  // Fallback to IP-based key if user is not authenticated
  return ipKeyGenerator(req);
};

/**
 * Rate limiter for the pixel placement endpoint. Allows 3 requests per 30 seconds per authenticated user or IP address.
 */
export const pixelPlacementLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 3, // 3 requests per 30 seconds
  message: "You have been rate limited",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
});

/**
 * Rate limiter for frame creation, modification, and deletion endpoints. Allows 10 requests per minute per authenticated user or IP address.
 */
export const frameMutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "You have been rate limited",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
});

/**
 * Rate limiter for the manual guild-membership refresh endpoint. Each call
 * bypasses our session cache and hits Discord's `/users/@me/guilds`, so we
 * tighten the budget to protect both our service and the user's Discord token.
 * Allows 3 requests per minute per authenticated user or IP address.
 */
export const guildRefreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: "You have been rate limited",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
});

/**
 * Rate limiter for pixel history retrieval endpoints.
 * Allows 2000 requests per 24 hours per authenticated user or IP address.
 */
export const historyQueryLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 2000, // 2000 requests per 24 hours
  message: "You have been rate limited",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
});
