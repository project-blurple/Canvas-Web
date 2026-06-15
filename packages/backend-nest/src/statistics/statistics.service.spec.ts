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

  describe("getLeaderboard", () => {
    it("returns a paginated leaderboard", async () => {
      const page = await service.getLeaderboard(1);
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
      const page = await service.getLeaderboard(1, 1, 1000);
      expect(page.size).toBe(40);
    });

    it("falls back to a default avatar when the user has no profile", async () => {
      await prisma.discordUserProfile.delete({ where: { userId: 1n } });

      const page = await service.getLeaderboard(1);

      expect(page.entries[0].username).toBeUndefined();
      expect(page.entries[0].profilePictureUrl).toBe(
        "https://example.com/default/1.png",
      );
      expect(discordProfileService.createDefaultAvatarUrl).toHaveBeenCalledWith(
        1n,
      );
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
});
