import type { Request } from "express";
import rateLimit from "express-rate-limit";

const keyGenerator = (req: Request) => {
  const cfConnectingIp = req.headers["cf-connecting-ip"];
  if (cfConnectingIp) {
    if (typeof cfConnectingIp === "string") {
      return cfConnectingIp;
    }
    return cfConnectingIp[0];
  }
  return req.ip ?? "";
};

/**
 * Rate limiter for the pixel placement endpoint. Allows 3 requests per 30 seconds per IP address.
 */
export const pixelPlacementLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 3, // 3 requests per 30 seconds
  message: "You have been rate limited",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

/**
 * Rate limiter for frame creation, modification, and deletion endpoints. Allows 10 requests per minute per IP address.
 */
export const frameMutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "You have been rate limited",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

/**
 * Rate limiter for the manual guild-membership refresh endpoint. Each call
 * bypasses our session cache and hits Discord's `/users/@me/guilds`, so we
 * tighten the budget to protect both our service and the user's Discord token.
 * Allows 3 requests per minute per IP address.
 */
export const guildRefreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: "You have been rate limited",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});
