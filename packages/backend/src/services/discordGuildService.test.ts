import type { SessionData } from "express-session";
import fetchWithRetries from "@/utils/fetchWithRetries";
import { getCachedUserGuildFlags } from "./discordGuildService";

vi.mock("@/utils/fetchWithRetries", () => ({
  default: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithRetries);

function mockGuildsResponse(
  guilds: Array<{
    id: string;
    name: string;
    permissions?: string;
    approximate_member_count?: number;
  }>,
) {
  mockFetch.mockResolvedValueOnce({
    status: 200,
    ok: true,
    headers: {
      get: (key: string) =>
        key === "content-type" ? "application/json; charset=utf-8" : null,
      entries: () => [][Symbol.iterator](),
    } as unknown as Headers,
    json: async () => guilds,
  } as unknown as Response);
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

describe("getCachedUserGuildFlags", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches fresh flags when the session has no cache", async () => {
    mockGuildsResponse(sampleGuilds);

    const session = makeSession();
    const result = await getCachedUserGuildFlags(session, "token");

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

    const result = await getCachedUserGuildFlags(session, "token");

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

    mockGuildsResponse([
      {
        id: "2",
        name: "Refreshed Guild",
        permissions: "0",
        approximate_member_count: 5,
      },
    ]);

    const result = await getCachedUserGuildFlags(session, "token");

    expect(result).toMatchObject({ "2": { name: "Refreshed Guild" } });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(session.discordGuildFlags).toEqual(result);
    expect(session.discordGuildFlagsFetchedAt).toBe(Date.now());
  });

  it("refetches when discordGuildFlagsFetchedAt is missing", async () => {
    mockGuildsResponse(sampleGuilds);

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

    const result = await getCachedUserGuildFlags(session, "token");

    expect(result).toMatchObject({ "1": { name: "Guild 1" } });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(session.discordGuildFlagsFetchedAt).toBe(Date.now());
  });
});
