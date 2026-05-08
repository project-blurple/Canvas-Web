import type { GuildData } from "@blurple-canvas-web/types/src/discordUserProfile";
import type { Request } from "express";
import type { Session } from "express-session";
import config from "@/config";
import { UnauthorizedError } from "@/errors";
import fetchWithRetries from "@/utils/fetchWithRetries";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface DiscordRequestSession extends Session {
  discordAccessToken?: string;
  discordRefreshToken?: string;
  discordGuildFlags?: Record<string, GuildData>;
  discordTokenExpiresAt?: number | null;
}

/**
 * Refresh the Discord access token using the stored refresh token on the session.
 * Updates `req.session.discordAccessToken`, `req.session.discordRefreshToken` and
 * `req.session.discordTokenExpiresAt` when successful and returns the new access token.
 */
export async function refreshDiscordAccessToken(req: Request): Promise<string> {
  const session = req.session as DiscordRequestSession;

  const currentRefresh = session.discordRefreshToken;
  if (!currentRefresh) {
    throw new UnauthorizedError("No Discord refresh token available");
  }

  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: "refresh_token",
    refresh_token: currentRefresh,
  });

  const response = await fetchWithRetries(
    "https://discord.com/api/v10/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  );

  if (!response.ok) {
    // clear tokens on failure
    session.discordAccessToken = undefined;
    session.discordRefreshToken = undefined;
    session.discordTokenExpiresAt = null;
    // attempt to save session if available
    try {
      await new Promise<void>((resolve) => session.save?.(() => resolve()));
    } catch {
      // ignore
    }
    throw new UnauthorizedError("Failed to refresh Discord access token");
  }

  const data = (await response.json()) as TokenResponse;

  session.discordAccessToken = data.access_token;
  if (data.refresh_token) {
    session.discordRefreshToken = data.refresh_token;
  }
  if (typeof data.expires_in === "number") {
    session.discordTokenExpiresAt = Date.now() + data.expires_in * 1000;
  } else {
    session.discordTokenExpiresAt = null;
  }

  try {
    await new Promise<void>((resolve) => session.save?.(() => resolve()));
  } catch {
    // ignore
  }

  return session.discordAccessToken as string;
}

/**
 * Returns a valid access token from the session, refreshing if expired or missing.
 */
export async function getValidAccessToken(req: Request): Promise<string> {
  const session = req.session as DiscordRequestSession;

  // If access token exists and not expired (or no expiry present), return it
  const token = session.discordAccessToken as string | undefined;
  const expiresAt = session.discordTokenExpiresAt as number | null | undefined;
  if (token && expiresAt && Date.now() < expiresAt - 30000) {
    return token;
  }

  // Otherwise try to refresh using refresh token
  return await refreshDiscordAccessToken(req);
}

export default {
  refreshDiscordAccessToken,
  getValidAccessToken,
};
