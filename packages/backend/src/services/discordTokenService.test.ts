import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/errors";
import {
  getDiscordAccessToken,
  refreshDiscordAccessToken,
  withDiscordAccessToken,
} from "./discordTokenService";

const { mockRequestNewAccessToken } = vi.hoisted(() => ({
  mockRequestNewAccessToken: vi.fn(),
}));

vi.mock("passport-oauth2-refresh", () => ({
  default: {
    requestNewAccessToken: mockRequestNewAccessToken,
  },
}));

describe("discordTokenService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("refreshDiscordAccessToken", () => {
    it("throws when the refresh token is missing", async () => {
      await expect(
        refreshDiscordAccessToken({ discordAccessToken: "token" }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      expect(mockRequestNewAccessToken).not.toHaveBeenCalled();
    });

    it("updates the session with refreshed tokens", async () => {
      mockRequestNewAccessToken.mockImplementationOnce(
        (
          _strategy: string,
          _refreshToken: string,
          done: (
            error: Error | null,
            accessToken?: string,
            refreshToken?: string,
          ) => void,
        ) => {
          done(null, "new-access-token", "new-refresh-token");
        },
      );

      const session = {
        discordAccessToken: "old-access-token",
        discordRefreshToken: "old-refresh-token",
        discordTokenExpiresAt: undefined,
      };

      const accessToken = await refreshDiscordAccessToken(session);

      expect(accessToken).toBe("new-access-token");
      expect(session.discordAccessToken).toBe("new-access-token");
      expect(session.discordRefreshToken).toBe("new-refresh-token");
      expect(session.discordTokenExpiresAt).toBeUndefined();
      expect(mockRequestNewAccessToken).toHaveBeenCalledWith(
        "discord",
        "old-refresh-token",
        expect.any(Function),
      );
    });
  });

  describe("getDiscordAccessToken", () => {
    it("returns the existing access token when no refresh is needed", async () => {
      const accessToken = await getDiscordAccessToken({
        discordAccessToken: "cached-token",
        discordRefreshToken: "refresh-token",
      });

      expect(accessToken).toBe("cached-token");
      expect(mockRequestNewAccessToken).not.toHaveBeenCalled();
    });

    it("refreshes when the access token is missing", async () => {
      mockRequestNewAccessToken.mockImplementationOnce(
        (
          _strategy: string,
          _refreshToken: string,
          done: (
            error: Error | null,
            accessToken?: string,
            refreshToken?: string,
          ) => void,
        ) => {
          done(null, "refreshed-token");
        },
      );

      const accessToken = await getDiscordAccessToken({
        discordRefreshToken: "refresh-token",
      });

      expect(accessToken).toBe("refreshed-token");
      expect(mockRequestNewAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe("withDiscordAccessToken", () => {
    it("retries once after an unauthorized error from the action", async () => {
      mockRequestNewAccessToken.mockImplementationOnce(
        (
          _strategy: string,
          _refreshToken: string,
          done: (
            error: Error | null,
            accessToken?: string,
            refreshToken?: string,
          ) => void,
        ) => {
          done(null, "refreshed-token");
        },
      );

      const action = vi
        .fn<(accessToken: string) => Promise<string>>()
        .mockRejectedValueOnce(new UnauthorizedError("unauthorized"))
        .mockResolvedValueOnce("retried-success");

      const result = await withDiscordAccessToken(
        {
          discordAccessToken: "cached-token",
          discordRefreshToken: "refresh-token",
        },
        action,
      );

      expect(result).toBe("retried-success");
      expect(action).toHaveBeenCalledTimes(2);
      expect(action).toHaveBeenNthCalledWith(1, "cached-token");
      expect(action).toHaveBeenNthCalledWith(2, "refreshed-token");
    });
  });
});
