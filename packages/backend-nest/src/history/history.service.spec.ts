import { Test, type TestingModule } from "@nestjs/testing";

import { BlocklistService } from "@/blocklist/blocklist.service";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import { PixelReconciliationService } from "@/canvas/pixel-reconciliation.service";
import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { PixelService } from "@/pixel/pixel.service";
import { BroadcastService } from "@/realtime/broadcast.service";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";
import { seedCanvases } from "@/test/seed/canvases";
import { seedColors } from "@/test/seed/colors";
import { seedEvents } from "@/test/seed/events";
import { seedUsers } from "@/test/seed/users";
import { HistoryService } from "./history.service";

const broadcastService = {
  broadcastPixel: vi.fn(),
  broadcastPixelsBulk: vi.fn(),
  broadcastCanvasInfo: vi.fn(),
};

describe("HistoryService", () => {
  let moduleRef: TestingModule;
  let service: HistoryService;
  let blocklistService: BlocklistService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [
        HistoryService,
        PixelService,
        PixelReconciliationService,
        BlocklistService,
        CanvasCacheService,
        { provide: BroadcastService, useValue: broadcastService },
      ],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(HistoryService);
    blocklistService = moduleRef.get(BlocklistService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe("getPixelHistorySummary", () => {
    beforeEach(async () => {
      await seedAll();
    });

    it("returns paginated history for a single point, newest first", async () => {
      const history = await service.getPixelHistorySummary({
        canvasId: 1,
        points: { x: 0, y: 0 },
      });

      expect(history.total).toBe(4);
      expect(history.entries).toHaveLength(4);
      expect(history.entries.map((entry) => entry.timestamp)).toEqual([
        new Date(7).toISOString(),
        new Date(3).toISOString(),
        new Date(2).toISOString(),
        new Date(1).toISOString(),
      ]);
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
      // No summary requested.
      expect(history.users).toBeUndefined();
    });

    it("computes the per-user summary and applies range/filter conditions", async () => {
      const history = await service.getPixelHistorySummary(
        {
          canvasId: 1,
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
          userIdFilter: { ids: [1n], include: true },
          colorFilter: { colors: [1], include: false },
        },
        true,
      );

      expect(history.total).toBe(2);
      expect(history.entries.map((entry) => entry.timestamp)).toEqual([
        new Date(9).toISOString(),
        new Date(8).toISOString(),
      ]);
      expect(history.users).toMatchObject({
        "1": {
          count: 2,
          colors: { "2": 1, "3": 1 },
          firstPlaced: new Date(8).toISOString(),
          lastPlaced: new Date(9).toISOString(),
        },
      });
      expect(history.entries[0]).toMatchObject({
        color: { id: 3, code: "red", global: false },
        userId: "1",
      });
    });

    it("omits overlay pixels when no complex filters are applied", async () => {
      const history = await service.getPixelHistorySummary({
        canvasId: 1,
        points: { x: 0, y: 0 },
      });

      expect(history.overlayPixels).toBeUndefined();
    });

    it("includes the latest colour per coordinate when filters are applied", async () => {
      await prisma.history.create({
        data: {
          canvasId: 1,
          userId: 9n,
          x: 0,
          y: 0,
          colorId: 2,
          timestamp: new Date(100),
        },
      });

      const history = await service.getPixelHistorySummary({
        canvasId: 1,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        userIdFilter: { ids: [1n], include: true },
      });

      expect(history.overlayPixels).toEqual([
        { x: 0, y: 0, colorId: 1 },
        { x: 0, y: 1, colorId: 3 },
        { x: 1, y: 0, colorId: 2 },
      ]);
      // Only user 1's six placements match the filter; user 9's is excluded.
      expect(history.total).toBe(6);
    });
  });

  describe("deletePixelHistoryEntries", () => {
    beforeEach(async () => {
      await seedAll();
    });

    it("erases matching rows, rebuilds the pixel and blocks the author", async () => {
      // (0,1) on canvas 1 has a single history row (colour 3); erasing it
      // should reconcile the pixel back to the blank colour (1).
      await service.deletePixelHistoryEntries(
        { canvasId: 1, points: { x: 0, y: 1 } },
        true,
      );

      const live = await prisma.history.findMany({
        where: { canvasId: 1, x: 0, y: 1, erasedAt: null },
      });
      expect(live).toHaveLength(0);

      const erased = await prisma.history.findMany({
        where: { canvasId: 1, x: 0, y: 1, erasedAt: { not: null } },
      });
      expect(erased).toHaveLength(1);

      const pixel = await prisma.pixel.findFirst({
        where: { canvasId: 1, x: 0, y: 1 },
      });
      expect(pixel?.colorId).toBe(1);

      await expect(blocklistService.userIsBlocklisted(1n)).resolves.toBe(true);
      expect(broadcastService.broadcastPixelsBulk).toHaveBeenCalledTimes(1);
    });

    it("does nothing when no rows match and never blocks", async () => {
      // (1,1) on canvas 1 has a pixel but no history rows.
      await service.deletePixelHistoryEntries(
        { canvasId: 1, points: { x: 1, y: 1 } },
        true,
      );

      await expect(blocklistService.userIsBlocklisted(1n)).resolves.toBe(false);
      expect(broadcastService.broadcastPixelsBulk).not.toHaveBeenCalled();
    });
  });

  describe("deletePixelHistoryEntries chunking", () => {
    const SIZE = 25; // 625 cells, > the 500-coordinate chunk size
    const REGION = 24; // erase a 24x24 = 576-coordinate region

    beforeEach(async () => {
      await seedEvents();
      await seedUsers();
      await seedCanvases();
      await seedColors();

      await prisma.canvas.create({
        data: {
          id: 100,
          name: "Big Canvas",
          locked: false,
          eventId: 1,
          width: SIZE,
          height: SIZE,
        },
      });

      const pixels: {
        canvasId: number;
        x: number;
        y: number;
        colorId: number;
      }[] = [];
      const histories: {
        canvasId: number;
        userId: bigint;
        x: number;
        y: number;
        colorId: number;
        timestamp: Date;
      }[] = [];
      let ts = 1;
      for (let x = 0; x < REGION; x++) {
        for (let y = 0; y < REGION; y++) {
          pixels.push({ canvasId: 100, x, y, colorId: 2 });
          histories.push({
            canvasId: 100,
            userId: 1n,
            x,
            y,
            colorId: 2,
            timestamp: new Date(ts++),
          });
        }
      }
      await prisma.pixel.createMany({ data: pixels });
      await prisma.history.createMany({ data: histories });
    });

    it("rebuilds every coordinate across chunk boundaries in one bulk broadcast", async () => {
      await service.deletePixelHistoryEntries({
        canvasId: 100,
        points: [
          { x: 0, y: 0 },
          { x: REGION - 1, y: REGION - 1 },
        ],
      });

      // All region pixels reconcile to the blank colour (no live history left).
      const nonBlank = await prisma.pixel.count({
        where: { canvasId: 100, colorId: { not: 1 } },
      });
      expect(nonBlank).toBe(0);

      // A single bulk broadcast carrying every erased coordinate.
      expect(broadcastService.broadcastPixelsBulk).toHaveBeenCalledTimes(1);
      const [, payload] = broadcastService.broadcastPixelsBulk.mock.calls[0];
      expect(payload.pixels).toHaveLength(REGION * REGION);
    });
  });
});
