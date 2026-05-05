import { prisma } from "@/client";
import seedAll from "@/test";
import { userIsBlocklisted } from "./blocklistService";
import {
  deletePixelHistoryEntries,
  getPixelHistorySummary,
} from "./historyService";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastPixelPlacement: vi.fn(),
  },
}));

/// These tests have been skipped as they are tightly coupled with the seeding data, which make these rather difficult to maintain.
/// These should be replaced by end-to-end tests in the future
describe.skip("historyService", () => {
  beforeEach(async () => {
    await seedAll();
  });

  describe("getPixelHistorySummary", () => {
    it("returns pixel history for a single point", async () => {
      const history = await getPixelHistorySummary({
        canvasId: 1,
        points: { x: 0, y: 0 },
      });

      expect(history.totalEntries).toBe(4);
      expect(history.historyIds).toEqual(["7", "3", "2", "1"]);
      expect(history.pixelHistory).toHaveLength(4);
      expect(history.pixelHistory.map((entry) => entry.timestamp)).toEqual([
        new Date(7),
        new Date(3),
        new Date(2),
        new Date(1),
      ]);
      expect(history.users).toMatchObject({
        "1": {
          count: 4,
          colors: {
            "1": 4,
          },
          firstPlaced: new Date(1),
          lastPlaced: new Date(7),
        },
      });
      expect(history.pixelHistory[0]).toMatchObject({
        color: {
          id: 1,
          code: "blank",
          name: "Blank tile",
          rgba: [88, 101, 242, 127],
          global: true,
        },
        userId: "1",
        userProfile: {
          id: "1",
          username: "test_user_1",
          profilePictureUrl: "https://example.com/avatar1.png",
        },
      });
    });

    it("applies range and filter conditions", async () => {
      const history = await getPixelHistorySummary({
        canvasId: 1,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        userIdFilter: {
          ids: [1n],
          include: true,
        },
        colorFilter: {
          colors: [1],
          include: false,
        },
      });

      expect(history.totalEntries).toBe(2);
      expect(history.historyIds).toEqual(["9", "8"]);
      expect(history.pixelHistory).toHaveLength(2);
      expect(history.pixelHistory.map((entry) => entry.timestamp)).toEqual([
        new Date(9),
        new Date(8),
      ]);
      expect(history.users).toMatchObject({
        "1": {
          count: 2,
          colors: {
            "3": 1,
            "1": 1,
          },
          firstPlaced: new Date(8),
          lastPlaced: new Date(9),
        },
      });
      expect(history.pixelHistory[0]).toMatchObject({
        color: {
          id: 3,
          code: "red",
          name: "Red",
          rgba: [234, 35, 40, 255],
          global: false,
        },
        userId: "1",
      });
    });
  });

  describe("deletePixelHistoryEntries", () => {
    it("deletes entries and blocks authors when requested", async () => {
      const entryOne = await prisma.history.create({
        data: {
          canvas_id: 1,
          user_id: 1n,
          x: 1,
          y: 1,
          color_id: 2,
          timestamp: new Date(100),
        },
      });
      const entryTwo = await prisma.history.create({
        data: {
          canvas_id: 1,
          user_id: 1n,
          x: 1,
          y: 0,
          color_id: 3,
          timestamp: new Date(101),
        },
      });

      await deletePixelHistoryEntries(1, [entryOne.id, entryTwo.id], true);

      await expect(
        prisma.history.findMany({
          where: {
            recorded: true,
            canvas_id: 1,
            id: {
              in: [entryOne.id, entryTwo.id],
            },
          },
        }),
      ).resolves.toStrictEqual([]);

      await expect(
        prisma.history.findMany({
          where: {
            recorded: false,
            canvas_id: 1,
            id: {
              in: [entryOne.id, entryTwo.id],
            },
          },
        }),
      ).resolves.toHaveLength(2);

      await expect(userIsBlocklisted(1n)).resolves.toBe(true);
    });

    it("rejects history IDs that do not belong to the canvas", async () => {
      const entry = await prisma.history.create({
        data: {
          canvas_id: 1,
          user_id: 1n,
          x: 0,
          y: 0,
          color_id: 1,
          timestamp: new Date(102),
        },
      });

      await expect(
        deletePixelHistoryEntries(1, [entry.id, 999n]),
      ).rejects.toThrow(
        `The following history IDs do not exist for canvas 1: 999`,
      );

      await expect(userIsBlocklisted(1n)).resolves.toBe(false);
    });
  });
});
