import type { NextFunction, Request, Response } from "express";

/* This function should be used as a middleware in testing to bypass the need to mock a passport strategy.
 *
 * Guild memberships can be injected via the `X-TestGuildIds` header
 * (comma-separateddecimal IDs).
 */
export const mockAuth = (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.header("x-TestUserId");
  if (userId) {
    req.user = {
      id: userId,
      username: "test",
      profilePictureUrl: "test",
    };

    const guildIdsHeader = req.header("x-TestGuildIds") ?? "";
    const guildIds = guildIdsHeader
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    req.session = {
      discordAccessToken: "test-access-token",
      discordRefreshToken: "test-refresh-token",
      discordTokenExpiresAt: Number.POSITIVE_INFINITY,
      discordGuildFlags: Object.fromEntries(
        guildIds.map((id) => [
          id,
          {
            name: `Guild ${id}`,
            memberCount: null,
            administrator: false,
            manageGuild: false,
          },
        ]),
      ),
      discordGuildFlagsFetchedAt: Date.now(),
    } as Request["session"];
  }
  next();
};
