import { Injectable } from "@nestjs/common";
import refresh from "passport-oauth2-refresh";

import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { DISCORD_STRATEGY_NAME } from "@/discord/discord.constants";

/** Refresh proactively when the token expires within this buffer. */
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

@Injectable()
export class DiscordTokenService {
  /** Deduplicates concurrent refreshes per session object. */
  private readonly inFlightRefreshes = new WeakMap<object, Promise<string>>();

  refreshDiscordAccessToken(session: DiscordTokenSession): Promise<string> {
    const existing = this.inFlightRefreshes.get(session);
    if (existing) {
      return existing;
    }

    const promise = this.doRefreshDiscordAccessToken(session).finally(() => {
      this.inFlightRefreshes.delete(session);
    });

    this.inFlightRefreshes.set(session, promise);
    return promise;
  }

  async getDiscordAccessToken(session: DiscordTokenSession): Promise<string> {
    if (this.shouldRefreshDiscordToken(session)) {
      return await this.refreshDiscordAccessToken(session);
    }

    if (!session.discordAccessToken) {
      throw new UnauthorizedError("Discord access token is missing");
    }

    return session.discordAccessToken;
  }

  async withDiscordAccessToken<T>(
    session: DiscordTokenSession,
    action: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const accessToken = await this.getDiscordAccessToken(session);

    try {
      return await action(accessToken);
    } catch (error) {
      if (error instanceof UnauthorizedError && session.discordRefreshToken) {
        const refreshedAccessToken =
          await this.refreshDiscordAccessToken(session);
        return await action(refreshedAccessToken);
      }

      throw error;
    }
  }

  private async doRefreshDiscordAccessToken(
    session: DiscordTokenSession,
  ): Promise<string> {
    if (!session.discordRefreshToken) {
      throw new UnauthorizedError("Discord refresh token is missing");
    }

    const refreshedToken = await this.requestDiscordTokenRefresh(
      session.discordRefreshToken,
    );

    session.discordAccessToken = refreshedToken.accessToken;

    if (refreshedToken.refreshToken) {
      session.discordRefreshToken = refreshedToken.refreshToken;
    }

    if (typeof session.discordTokenLifetimeMs === "number") {
      session.discordTokenExpiresAt =
        Date.now() + session.discordTokenLifetimeMs;
    } else {
      session.discordTokenExpiresAt = undefined;
    }

    return refreshedToken.accessToken;
  }

  private shouldRefreshDiscordToken(session: DiscordTokenSession): boolean {
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

  private requestDiscordTokenRefresh(
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
            reject(
              new UnauthorizedError("Discord access token refresh failed"),
            );
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
}
