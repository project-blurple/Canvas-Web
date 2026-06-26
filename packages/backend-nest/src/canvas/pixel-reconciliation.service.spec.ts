import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { BroadcastService } from "@/realtime/broadcast.service";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";
import { CanvasCacheService } from "./canvas-cache.service";
import { PixelReconciliationService } from "./pixel-reconciliation.service";

const broadcastService = {
  broadcastPixel: vi.fn(),
  broadcastPixelsBulk: vi.fn(),
  broadcastCanvasInfo: vi.fn(),
};

describe("PixelReconciliationService", () => {
  let moduleRef: TestingModule;
  let service: PixelReconciliationService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [
        PixelReconciliationService,
        CanvasCacheService,
        { provide: BroadcastService, useValue: broadcastService },
      ],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(PixelReconciliationService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await seedAll();

    // An erased placement by user 9 on each canvas, on a cell that otherwise
    // has no live history (canvas 1 (1,1) and canvas 9 (1,1)).
    await prisma.history.createMany({
      data: [
        {
          canvasId: 1,
          userId: 9n,
          x: 1,
          y: 1,
          colorId: 2,
          timestamp: new Date("2024-01-01T00:00:00.000Z"),
          erasedAt: new Date("2024-01-02T00:00:00.000Z"),
        },
        {
          canvasId: 9,
          userId: 9n,
          x: 1,
          y: 1,
          colorId: 2,
          timestamp: new Date("2024-01-03T00:00:00.000Z"),
          erasedAt: new Date("2024-01-04T00:00:00.000Z"),
        },
      ],
    });
  });

  describe("restoreErasedHistory", () => {
    it("un-erases only the requested canvas and rebuilds its pixels", async () => {
      await service.restoreErasedHistory([9n], [1]);

      const restored = await prisma.history.findFirst({
        where: { canvasId: 1, userId: 9n, x: 1, y: 1 },
      });
      expect(restored?.erasedAt).toBeNull();

      const pixel = await prisma.pixel.findFirst({
        where: { canvasId: 1, x: 1, y: 1 },
      });
      expect(pixel?.colorId).toBe(2);

      // The other canvas's erased row is untouched.
      const untouched = await prisma.history.findFirst({
        where: { canvasId: 9, userId: 9n, x: 1, y: 1 },
      });
      expect(untouched?.erasedAt).toBeInstanceOf(Date);

      expect(broadcastService.broadcastPixelsBulk).toHaveBeenCalledTimes(1);
    });

    it("does nothing when there are no erased rows to restore", async () => {
      await service.restoreErasedHistory([1n], [1]);

      expect(broadcastService.broadcastPixelsBulk).not.toHaveBeenCalled();
    });

    it("does nothing for empty inputs", async () => {
      await service.restoreErasedHistory([], [1]);
      await service.restoreErasedHistory([9n], []);

      expect(broadcastService.broadcastPixelsBulk).not.toHaveBeenCalled();
    });
  });
});
