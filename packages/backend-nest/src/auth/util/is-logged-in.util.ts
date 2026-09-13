import type { Request } from "express";

export function isLoggedIn(req: Request): boolean {
  return Boolean(
    req.user &&
    (req.session?.discordAccessToken || req.session?.discordRefreshToken),
  );
}
