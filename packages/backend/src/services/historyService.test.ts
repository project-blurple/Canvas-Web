import { prisma } from "@/client";
import seedAll from "@/test";
import { userIsBlocklisted } from "./blocklistService";
import {
  deletePixelHistoryEntries,
  getPixelHistorySummary,
  restorePixelHistoryEntries,
} from "./historyService";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastPixelPlacement: vi.fn(),
    broadcastPixelBulkPlacement: vi.fn(),
  },
}));

const updateCachedCanvasPixelMock = vi.fn();

vi.mock("./canvasService", () => ({
  updateCachedCanvasPixel: updateCachedCanvasPixelMock,
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

      expect(history.total).toBe(4);
      expect(history.entries).toHaveLength(4);
      expect(history.entries.map((entry) => entry.timestamp)).toEqual([
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
      expect(history.entries[0]).toMatchObject({
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

      expect(history.total).toBe(2);
      expect(history.entries).toHaveLength(2);
      expect(history.entries.map((entry) => entry.timestamp)).toEqual([
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
      expect(history.entries[0]).toMatchObject({
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

      await deletePixelHistoryEntries(
        {
          canvasId: 1,
          points: [
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        },
        true,
      );

      await expect(
        prisma.history.findMany({
          where: {
            erased_at: null,
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
            erased_at: {
              not: null,
            },
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
      await expect(
        deletePixelHistoryEntries({ canvasId: 1, points: { x: 0, y: 0 } }),
      ).rejects.toThrow(
        `The following history IDs do not exist for canvas 1: 999`,
      );

      await expect(userIsBlocklisted(1n)).resolves.toBe(false);
    });
  });
});

describe("restorePixelHistoryEntries", () => {
  async function setupMinimalCanvas() {
    await prisma.event.create({
      data: { id: 1, name: "Test Event" },
    });
    await prisma.discord_guild_record.create({
      data: { guild_id: 1n, name: "Test Guild" },
    });
    await prisma.guild.create({
      data: { id: 1n, invite: "test-guild" },
    });
    await prisma.user.createMany({
      data: [{ id: 1n }, { id: 2n }],
    });
    await prisma.canvas.create({
      data: {
        id: 1,
        event_id: 1,
        name: "Test Canvas",
        width: 2,
        height: 2,
        locked: false,
        cooldown_length: 0,
      },
    });
    await prisma.color.createMany({
      data: [
        {
          id: 1,
          code: "blank",
          emoji_name: "pl_blank",
          emoji_id: 540761786484391957n,
          global: true,
          name: "Blank",
          rgba: [88, 101, 242, 127],
        },
        {
          id: 2,
          code: "red",
          emoji_name: "pl_red",
          emoji_id: 572564652559564810n,
          global: true,
          name: "Red",
          rgba: [234, 35, 40, 255],
        },
        {
          id: 3,
          code: "blue",
          emoji_name: "pl_blue",
          emoji_id: 840064486374637608n,
          global: true,
          name: "Blue",
          rgba: [0, 90, 166, 255],
        },
      ],
    });
  }

  beforeEach(async () => {
    await setupMinimalCanvas();
    vi.clearAllMocks();
  });

  it("un-erases history and refreshes affected pixels", async () => {
    await prisma.pixel.create({
      data: { canvas_id: 1, x: 0, y: 0, color_id: 1 },
    });
    await prisma.pixel.create({
      data: { canvas_id: 1, x: 1, y: 0, color_id: 1 },
    });

    await prisma.history.createMany({
      data: [
        {
          canvas_id: 1,
          user_id: 9n,
          x: 0,
          y: 0,
          color_id: 2,
          timestamp: new Date("2024-01-01T00:00:00.000Z"),
          erased_at: new Date("2024-01-02T00:00:00.000Z"),
          guild_id: 1n,
        },
        {
          canvas_id: 1,
          user_id: 9n,
          x: 1,
          y: 0,
          color_id: 3,
          timestamp: new Date("2024-01-03T00:00:00.000Z"),
          erased_at: new Date("2024-01-04T00:00:00.000Z"),
          guild_id: 1n,
        },
        {
          canvas_id: 2,
          user_id: 9n,
          x: 0,
          y: 1,
          color_id: 2,
          timestamp: new Date("2024-01-05T00:00:00.000Z"),
          erased_at: new Date("2024-01-06T00:00:00.000Z"),
          guild_id: 1n,
        },
      ],
    });

    await restorePixelHistoryEntries([9n], [1]);

    const restoredHistory = await prisma.history.findMany({
      where: { user_id: 9n },
      orderBy: [{ x: "asc" }, { y: "asc" }],
    });

    expect(restoredHistory.every((entry) => entry.erased_at === null)).toBe(
      true,
    );

    const restoredPixels = await prisma.pixel.findMany({
      where: { canvas_id: 1 },
      orderBy: [{ x: "asc" }, { y: "asc" }],
    });

    expect(restoredPixels).toMatchObject([
      { x: 0, y: 0, color_id: 2 },
      { x: 1, y: 0, color_id: 3 },
    ]);
    await expect(
      prisma.history.findFirst({
        where: { canvas_id: 2, user_id: 9n },
      }),
    ).resolves.toMatchObject({
      erased_at: expect.any(Date),
    });
    expect(updateCachedCanvasPixelMock).toHaveBeenCalledTimes(2);
  });
});
