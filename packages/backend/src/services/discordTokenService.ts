import refresh from "passport-oauth2-refresh";

import { UnauthorizedError } from "@/errors";

const DISCORD_STRATEGY_NAME = "discord";
const DISCORD_TOKEN_REFRESH_BUFFER_MS = 30_000;

export interface DiscordTokenSession {
  discordAccessToken?: string;
  discordRefreshToken?: string;
  discordTokenExpiresAt?: number;
  discordTokenLifetimeMs?: number;
}

interface DiscordRefreshedTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

function shouldRefreshDiscordToken(session: DiscordTokenSession): boolean {
  if (!session.discordAccessToken) {
    return true;
  }

  if (
    !session.discordTokenExpiresAt ||
    !Number.isFinite(session.discordTokenExpiresAt)
  ) {
    return false;
  }

  return (
    Date.now() >=
    session.discordTokenExpiresAt - DISCORD_TOKEN_REFRESH_BUFFER_MS
  );
}

function requestDiscordTokenRefresh(
  refreshToken: string,
): Promise<DiscordRefreshedTokenResponse> {
  return new Promise((resolve, reject) => {
    refresh.requestNewAccessToken(
      DISCORD_STRATEGY_NAME,
      refreshToken,
      (
        error: Error | null,
        accessToken?: string,
        nextRefreshToken?: string,
      ) => {
        if (error) {
          reject(error);
          return;
        }

        if (!accessToken) {
          reject(new UnauthorizedError("Discord access token refresh failed"));
          return;
        }

        resolve({
          accessToken,
          refreshToken: nextRefreshToken,
        });
      },
    );
  });
}

export async function refreshDiscordAccessToken(
  session: DiscordTokenSession,
): Promise<string> {
  if (!session.discordRefreshToken) {
    throw new UnauthorizedError("Discord refresh token is missing");
  }

  const refreshedToken = await requestDiscordTokenRefresh(
    session.discordRefreshToken,
  );

  session.discordAccessToken = refreshedToken.accessToken;

  if (refreshedToken.refreshToken) {
    session.discordRefreshToken = refreshedToken.refreshToken;
  }

  if (typeof session.discordTokenLifetimeMs === "number") {
    session.discordTokenExpiresAt = Date.now() + session.discordTokenLifetimeMs;
  } else {
    session.discordTokenExpiresAt = undefined;
  }

  return refreshedToken.accessToken;
}

export async function getDiscordAccessToken(
  session: DiscordTokenSession,
): Promise<string> {
  if (shouldRefreshDiscordToken(session)) {
    return await refreshDiscordAccessToken(session);
  }

  if (!session.discordAccessToken) {
    throw new UnauthorizedError("Discord access token is missing");
  }

  return session.discordAccessToken;
}

export async function withDiscordAccessToken<T>(
  session: DiscordTokenSession,
  action: (accessToken: string) => Promise<T>,
): Promise<T> {
  const accessToken = await getDiscordAccessToken(session);

  try {
    return await action(accessToken);
  } catch (error) {
    if (error instanceof UnauthorizedError && session.discordRefreshToken) {
      const refreshedAccessToken = await refreshDiscordAccessToken(session);
      return await action(refreshedAccessToken);
    }

    throw error;
  }
}
