import { Test, type TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "@/common/database/database.module";
import { NotFoundError } from "@/common/errors/not-found.error";
import { AppConfigModule } from "@/config/config.module";
import { DiscordProfileService } from "@/discord/discord-profile.service";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";
import { StatisticsService } from "./statistics.service";

const discordProfileService = {
  createDefaultAvatarUrl: vi.fn(
    (userId: bigint) => `https://example.com/default/${userId}.png`,
  ),
};

describe("StatisticsService", () => {
  let moduleRef: TestingModule;
  let service: StatisticsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [
        StatisticsService,
        { provide: DiscordProfileService, useValue: discordProfileService },
      ],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(StatisticsService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await seedAll();
  });

  describe("getUserStats", () => {
    it("returns the user's stats on a canvas", async () => {
      const stats = await service.getUserStats("1", 1);
      expect(stats).toMatchObject({
        userId: "1",
        canvasId: 1,
        totalPixels: 6,
        rank: 1,
      });
      expect(stats?.mostFrequentColor?.id).toBe(1);
      expect(stats?.mostRecentTimestamp).toBeDefined();
    });

    it("returns null when the user has no stats", async () => {
      await expect(service.getUserStats("1234", 1)).resolves.toBeNull();
    });
  });

  describe("getCanvasLeaderboard", () => {
    it("returns a paginated leaderboard", async () => {
      const page = await service.getCanvasLeaderboard({ canvasId: 1 });
      expect(page.total).toBe(1);
      expect(page.page).toBe(1);
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0]).toMatchObject({
        rank: 1,
        userId: "1",
        totalPixels: 6,
        username: "test_user_1",
        profilePictureUrl: "https://example.com/avatar1.png",
      });
    });

    it("clamps the page size to 40", async () => {
      const page = await service.getCanvasLeaderboard({
        canvasId: 1,
        page: 1,
        size: 1000,
      });
      expect(page.size).toBe(40);
    });

    it("falls back to a default avatar when the user has no profile", async () => {
      await prisma.discordUserProfile.delete({ where: { userId: 1n } });

      const page = await service.getCanvasLeaderboard({ canvasId: 1 });

      expect(page.entries[0].username).toBeUndefined();
      expect(page.entries[0].profilePictureUrl).toBe(
        "https://example.com/default/1.png",
      );
      expect(discordProfileService.createDefaultAvatarUrl).toHaveBeenCalledWith(
        1n,
      );
    });
  });

  describe("getCanvasColorLeaderboard", () => {
    it("returns a paginated leaderboard for a single color", async () => {
      const page = await service.getCanvasColorLeaderboard({
        canvasId: 1,
        colorId: 1,
      });
      expect(page.total).toBe(1);
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0]).toMatchObject({
        rank: 1,
        userId: "1",
        totalPixels: 4,
        username: "test_user_1",
      });
    });

    it("returns every color's leaderboard when no color is given", async () => {
      const page = await service.getCanvasColorLeaderboard({ canvasId: 1 });
      expect(page.total).toBe(3);
      expect(page.entries).toHaveLength(3);
    });
  });

  describe("getFrameLeaderboard", () => {
    it("returns a paginated leaderboard for a frame", async () => {
      await createFrameForCanvas(1, "abc123");

      const page = await service.getFrameLeaderboard({ frameId: "abc123" });
      expect(page.total).toBe(1);
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0]).toMatchObject({
        rank: 1,
        userId: "1",
        totalPixels: 6,
        username: "test_user_1",
      });
    });

    it("matches the frame ID case-insensitively", async () => {
      await createFrameForCanvas(1, "abc123");

      const page = await service.getFrameLeaderboard({ frameId: "ABC123" });
      expect(page.total).toBe(1);
      expect(page.entries[0]).toMatchObject({ userId: "1", totalPixels: 6 });
    });
  });

  describe("getFrameColorLeaderboard", () => {
    it("returns a paginated leaderboard for a frame color", async () => {
      await createFrameForCanvas(1, "abc123");

      const page = await service.getFrameColorLeaderboard({
        frameId: "abc123",
        colorId: 1,
      });
      expect(page.total).toBe(1);
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0]).toMatchObject({
        rank: 1,
        userId: "1",
        totalPixels: 4,
      });
    });
  });

  describe("getCanvasStatisticsSummary", () => {
    it("returns aggregate canvas statistics", async () => {
      const summary = await service.getCanvasStatisticsSummary(1);
      expect(summary).toMatchObject({
        canvasId: 1,
        totalUsersInvolved: 1,
        totalPixelsPlaced: 6,
      });
      expect(summary.lastPlacedAt).not.toBeNull();
    });

    it("includes the color distribution ordered by count", async () => {
      const summary = await service.getCanvasStatisticsSummary(1);
      expect(summary.colorDistribution[0]).toEqual({ colorId: 1, count: 4 });
      expect(summary.colorDistribution).toHaveLength(3);
      expect(summary.colorDistribution).toEqual(
        expect.arrayContaining([
          { colorId: 2, count: 1 },
          { colorId: 3, count: 1 },
        ]),
      );
    });

    it("throws NotFoundError for a canvas with no statistics", async () => {
      await expect(
        service.getCanvasStatisticsSummary(404),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getEventStatisticsSummary", () => {
    it("returns aggregate event statistics", async () => {
      const summary = await service.getEventStatisticsSummary(1);
      expect(summary).toMatchObject({
        eventId: 1,
        totalUsersInvolved: 1,
        totalPixelsPlaced: 6,
      });
    });

    it("throws NotFoundError for an event with no statistics", async () => {
      await expect(
        service.getEventStatisticsSummary(404),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getFrameStatisticsSummary", () => {
    it("returns aggregate frame statistics with a color distribution", async () => {
      await createFrameForCanvas(1, "abc123");

      const summary = await service.getFrameStatisticsSummary("abc123");
      expect(summary).toMatchObject({
        frameId: "abc123",
        totalUsersInvolved: 1,
        totalPixelsPlaced: 6,
      });
      expect(summary.lastPlacedAt).not.toBeNull();
      expect(summary.colorDistribution[0]).toEqual({ colorId: 1, count: 4 });
      expect(summary.colorDistribution).toHaveLength(3);
    });

    it("matches the frame ID case-insensitively and returns the stored ID", async () => {
      await createFrameForCanvas(1, "abc123");

      const summary = await service.getFrameStatisticsSummary("ABC123");
      expect(summary.frameId).toBe("abc123");
      expect(summary.totalPixelsPlaced).toBe(6);
    });

    it("throws NotFoundError for a frame with no statistics", async () => {
      await expect(
        service.getFrameStatisticsSummary("ffffff"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});

async function createFrameForCanvas(canvasId: number, id: string) {
  await prisma.frame.create({
    data: {
      id,
      canvasId,
      ownerUserId: 1n,
      name: `Frame ${id}`,
      x0: 0,
      y0: 0,
      x1: 1,
      y1: 1,
    },
  });
}
