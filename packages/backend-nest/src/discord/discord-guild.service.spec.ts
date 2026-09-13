import { Test } from "@nestjs/testing";
import type { SessionData } from "express-session";

import { PrismaService } from "@/common/database/core/prisma.service";
import { NotFoundError } from "@/common/errors/not-found.error";
import { TooManyRequestsError } from "@/common/errors/too-many-requests.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { fetchWithRetries } from "@/common/fetch-with-retries";
import { type DiscordConfig, discordConfig } from "@/config/discord.config";
import { DiscordGuildService } from "@/discord/discord-guild.service";
import { testPrisma as prisma } from "@/test/database";

vi.mock("@/common/fetch-with-retries", () => ({
  fetchWithRetries: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithRetries);

const managementConfig: DiscordConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  managementGuildId: "999",
  adminRoleId: "admin-role",
  moderatorRoleId: "mod-role",
  serverInvite: undefined,
};

async function makeService(
  config: Partial<DiscordConfig> = {},
): Promise<DiscordGuildService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      DiscordGuildService,
      { provide: PrismaService, useValue: prisma },
      {
        provide: discordConfig.KEY,
        useValue: { ...managementConfig, ...config },
      },
    ],
  }).compile();

  return moduleRef.get(DiscordGuildService);
}

function mockJsonResponseOnce(body: unknown, init?: ResponseInit) {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      ...init,
    }),
  );
}

function makeSession(overrides: Partial<SessionData> = {}): SessionData {
  return { cookie: {} as SessionData["cookie"], ...overrides };
}

const sampleGuilds = [
  {
    id: "1",
    name: "Guild 1",
    permissions: "0",
    approximate_member_count: 10,
  },
];

describe("DiscordGuildService", () => {
  let service: DiscordGuildService;

  beforeEach(async () => {
    mockFetch.mockReset();
    service = await makeService();
  });

  describe("getCachedUserGuildFlags", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("fetches fresh flags when the session has no cache", async () => {
      mockJsonResponseOnce(sampleGuilds);

      const session = makeSession();
      const result = await service.getCachedUserGuildFlags(session, "token");

      expect(result).toMatchObject({ "1": { name: "Guild 1" } });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(session.discordGuildFlags).toEqual(result);
      expect(session.discordGuildFlagsFetchedAt).toBe(Date.now());
    });

    it("returns cached flags within the TTL window without hitting Discord", async () => {
      const cachedFlags = {
        "1": {
          name: "Cached Guild",
          memberCount: 10,
          administrator: false,
          manageGuild: false,
        },
      };
      const session = makeSession({
        discordGuildFlags: cachedFlags,
        discordGuildFlagsFetchedAt: Date.now(),
      });

      vi.advanceTimersByTime(14 * 60 * 1000);

      const result = await service.getCachedUserGuildFlags(session, "token");

      expect(result).toEqual(cachedFlags);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("refetches when the cached flags are older than the TTL", async () => {
      const cachedFlags = {
        "1": {
          name: "Stale Guild",
          memberCount: 10,
          administrator: false,
          manageGuild: false,
        },
      };
      const session = makeSession({
        discordGuildFlags: cachedFlags,
        discordGuildFlagsFetchedAt: Date.now(),
      });

      vi.advanceTimersByTime(15 * 60 * 1000 + 1);

      mockJsonResponseOnce([
        {
          id: "2",
          name: "Refreshed Guild",
          permissions: "0",
          approximate_member_count: 5,
        },
      ]);

      const result = await service.getCachedUserGuildFlags(session, "token");

      expect(result).toMatchObject({ "2": { name: "Refreshed Guild" } });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(session.discordGuildFlags).toEqual(result);
      expect(session.discordGuildFlagsFetchedAt).toBe(Date.now());
    });

    it("refetches when discordGuildFlagsFetchedAt is missing", async () => {
      mockJsonResponseOnce(sampleGuilds);

      const session = makeSession({
        discordGuildFlags: {
          old: {
            name: "Old",
            memberCount: null,
            administrator: false,
            manageGuild: false,
          },
        },
      });

      const result = await service.getCachedUserGuildFlags(session, "token");

      expect(result).toMatchObject({ "1": { name: "Guild 1" } });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(session.discordGuildFlagsFetchedAt).toBe(Date.now());
    });
  });

  describe("getGuildPermissionsForUser", () => {
    it.each([
      ["8", { administrator: true, manage_guild: true }],
      ["32", { administrator: false, manage_guild: true }],
      ["40", { administrator: true, manage_guild: true }],
      ["0", { administrator: false, manage_guild: false }],
      [undefined, { administrator: false, manage_guild: false }],
    ])("maps the permission bitfield %s", async (permissions, expected) => {
      mockJsonResponseOnce([{ id: "42", name: "Guild", permissions }]);

      const result = await service.getGuildPermissionsForUser("42", "token");

      expect(result).toEqual(expected);
    });

    it("throws NotFoundError when the guild is not in the user's list", async () => {
      mockJsonResponseOnce(sampleGuilds);

      await expect(
        service.getGuildPermissionsForUser("42", "token"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getCurrentUserGuildFlags", () => {
    it("derives administrator and manageGuild flags per guild", async () => {
      mockJsonResponseOnce([
        {
          id: "1",
          name: "Admin Guild",
          permissions: "8",
          approximate_member_count: 3,
        },
        { id: "2", name: "Member Guild", permissions: "0" },
      ]);

      const result = await service.getCurrentUserGuildFlags("token");

      expect(result).toEqual({
        "1": {
          name: "Admin Guild",
          memberCount: 3,
          administrator: true,
          manageGuild: true,
        },
        "2": {
          name: "Member Guild",
          memberCount: null,
          administrator: false,
          manageGuild: false,
        },
      });
    });

    it("maps Discord 401 responses onto UnauthorizedError", async () => {
      mockJsonResponseOnce({}, { status: 401 });

      await expect(
        service.getCurrentUserGuildFlags("token"),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("maps Discord 429 responses onto TooManyRequestsError", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockJsonResponseOnce(
        {},
        { status: 429, headers: { "retry-after": "1.5" } },
      );

      await expect(
        service.getCurrentUserGuildFlags("token"),
      ).rejects.toBeInstanceOf(TooManyRequestsError);
      vi.restoreAllMocks();
    });
  });

  describe("isCanvasAdmin / isCanvasModerator", () => {
    it("returns true when the member has the admin role", async () => {
      mockJsonResponseOnce({ roles: ["admin-role", "other"] });

      await expect(service.isCanvasAdmin("token")).resolves.toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://discord.com/api/v10/users/@me/guilds/999/member",
        expect.anything(),
      );
    });

    it("returns false when the member lacks the admin role", async () => {
      mockJsonResponseOnce({ roles: ["mod-role"] });

      await expect(service.isCanvasAdmin("token")).resolves.toBe(false);
    });

    it("accepts either the moderator or the admin role for moderators", async () => {
      mockJsonResponseOnce({ roles: ["admin-role"] });

      await expect(service.isCanvasModerator("token")).resolves.toBe(true);
    });

    it("returns false when the user is not a member of the management guild", async () => {
      mockJsonResponseOnce({}, { status: 404 });

      await expect(service.isCanvasModerator("token")).resolves.toBe(false);
    });

    it("returns false without hitting Discord when the management guild is not configured", async () => {
      const service = await makeService({
        managementGuildId: undefined,
      });

      await expect(service.isCanvasAdmin("token")).resolves.toBe(false);
      await expect(service.isCanvasModerator("token")).resolves.toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns false for admins when no admin role is configured", async () => {
      const service = await makeService({ adminRoleId: undefined });

      await expect(service.isCanvasAdmin("token")).resolves.toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("syncDiscordGuildRecords", () => {
    it("creates records for unknown guilds", async () => {
      await service.syncDiscordGuildRecords({
        "123": {
          name: "New Guild",
          memberCount: 1,
          administrator: false,
          manageGuild: false,
        },
      });

      const record = await prisma.discordGuildRecord.findUnique({
        where: { guildId: 123n },
      });
      expect(record).toEqual({ guildId: 123n, name: "New Guild" });
    });

    it("updates records whose name changed", async () => {
      await prisma.discordGuildRecord.create({
        data: { guildId: 123n, name: "Old Name" },
      });

      await service.syncDiscordGuildRecords({
        "123": {
          name: "New Name",
          memberCount: 1,
          administrator: false,
          manageGuild: false,
        },
      });

      const record = await prisma.discordGuildRecord.findUnique({
        where: { guildId: 123n },
      });
      expect(record).toEqual({ guildId: 123n, name: "New Name" });
    });

    it("leaves unchanged records alone and handles empty input", async () => {
      await prisma.discordGuildRecord.create({
        data: { guildId: 123n, name: "Same Name" },
      });

      await service.syncDiscordGuildRecords({
        "123": {
          name: "Same Name",
          memberCount: 1,
          administrator: false,
          manageGuild: false,
        },
      });
      await service.syncDiscordGuildRecords({});
      await service.syncDiscordGuildRecords(undefined);

      const record = await prisma.discordGuildRecord.findUnique({
        where: { guildId: 123n },
      });
      expect(record).toEqual({ guildId: 123n, name: "Same Name" });
    });
  });
});
