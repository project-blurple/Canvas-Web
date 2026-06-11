import { Test, type TestingModule } from "@nestjs/testing";

import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { DiscordTokenService } from "@/discord/discord-token.service";

const { mockRequestNewAccessToken } = vi.hoisted(() => ({
  mockRequestNewAccessToken: vi.fn(),
}));

vi.mock("passport-oauth2-refresh", () => ({
  default: {
    requestNewAccessToken: mockRequestNewAccessToken,
  },
}));

type RefreshDone = (
  error: Error | null,
  accessToken?: string,
  refreshToken?: string,
) => void;

function mockRefreshOnce(accessToken?: string, refreshToken?: string) {
  mockRequestNewAccessToken.mockImplementationOnce(
    (_strategy: string, _refreshToken: string, done: RefreshDone) => {
      done(null, accessToken, refreshToken);
    },
  );
}

describe("DiscordTokenService", () => {
  let moduleRef: TestingModule;
  let service: DiscordTokenService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [DiscordTokenService],
    }).compile();
    service = moduleRef.get(DiscordTokenService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("refreshDiscordAccessToken", () => {
    it("throws when the refresh token is missing", async () => {
      await expect(
        service.refreshDiscordAccessToken({ discordAccessToken: "token" }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      expect(mockRequestNewAccessToken).not.toHaveBeenCalled();
    });

    it("updates the session with refreshed tokens", async () => {
      mockRefreshOnce("new-access-token", "new-refresh-token");

      const session = {
        discordAccessToken: "old-access-token",
        discordRefreshToken: "old-refresh-token",
        discordTokenExpiresAt: undefined,
      };

      const accessToken = await service.refreshDiscordAccessToken(session);

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

    it("tracks the new expiry when the token lifetime is known", async () => {
      vi.useFakeTimers({ now: 1_000_000 });
      mockRefreshOnce("new-access-token");

      const session = {
        discordRefreshToken: "refresh-token",
        discordTokenLifetimeMs: 60_000,
      };

      await service.refreshDiscordAccessToken(session);

      expect(session).toMatchObject({ discordTokenExpiresAt: 1_060_000 });
      vi.useRealTimers();
    });

    it("deduplicates concurrent refreshes for the same session", async () => {
      let resolveRefresh: RefreshDone | undefined;
      mockRequestNewAccessToken.mockImplementationOnce(
        (_strategy: string, _refreshToken: string, done: RefreshDone) => {
          resolveRefresh = done;
        },
      );

      const session = { discordRefreshToken: "refresh-token" };

      const first = service.refreshDiscordAccessToken(session);
      const second = service.refreshDiscordAccessToken(session);

      resolveRefresh?.(null, "refreshed-token");

      await expect(first).resolves.toBe("refreshed-token");
      await expect(second).resolves.toBe("refreshed-token");
      expect(mockRequestNewAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe("getDiscordAccessToken", () => {
    it("returns the existing access token when no refresh is needed", async () => {
      const accessToken = await service.getDiscordAccessToken({
        discordAccessToken: "cached-token",
        discordRefreshToken: "refresh-token",
      });

      expect(accessToken).toBe("cached-token");
      expect(mockRequestNewAccessToken).not.toHaveBeenCalled();
    });

    it("refreshes when the access token is missing", async () => {
      mockRefreshOnce("refreshed-token");

      const accessToken = await service.getDiscordAccessToken({
        discordRefreshToken: "refresh-token",
      });

      expect(accessToken).toBe("refreshed-token");
      expect(mockRequestNewAccessToken).toHaveBeenCalledTimes(1);
    });

    it("refreshes when the token expires within the 30 s buffer", async () => {
      vi.useFakeTimers({ now: 1_000_000 });
      mockRefreshOnce("refreshed-token");

      const accessToken = await service.getDiscordAccessToken({
        discordAccessToken: "cached-token",
        discordRefreshToken: "refresh-token",
        discordTokenExpiresAt: 1_000_000 + 29_999,
      });

      expect(accessToken).toBe("refreshed-token");
      expect(mockRequestNewAccessToken).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it("keeps the cached token while outside the refresh buffer", async () => {
      vi.useFakeTimers({ now: 1_000_000 });

      const accessToken = await service.getDiscordAccessToken({
        discordAccessToken: "cached-token",
        discordRefreshToken: "refresh-token",
        discordTokenExpiresAt: 1_000_000 + 30_001,
      });

      expect(accessToken).toBe("cached-token");
      expect(mockRequestNewAccessToken).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("withDiscordAccessToken", () => {
    it("retries once after an unauthorized error from the action", async () => {
      mockRefreshOnce("refreshed-token");

      const action = vi
        .fn<(accessToken: string) => Promise<string>>()
        .mockRejectedValueOnce(new UnauthorizedError("unauthorized"))
        .mockResolvedValueOnce("retried-success");

      const result = await service.withDiscordAccessToken(
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

    it("rethrows unauthorized errors when no refresh token is available", async () => {
      const action = vi
        .fn<(accessToken: string) => Promise<string>>()
        .mockRejectedValue(new UnauthorizedError("unauthorized"));

      await expect(
        service.withDiscordAccessToken(
          { discordAccessToken: "cached-token" },
          action,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      expect(action).toHaveBeenCalledTimes(1);
    });
  });
});
