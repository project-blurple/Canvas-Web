import { CanvasPlaceState } from "@blurple-canvas-web/types";
import { Test, type TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "@/common/database/database.module";
import { NotFoundError } from "@/common/errors/not-found.error";
import { UnprocessableError } from "@/common/errors/unprocessable.error";
import { AppConfigModule } from "@/config/config.module";
import { BroadcastService } from "@/realtime/broadcast.service";
import { testPrisma as prisma, resetSequence } from "@/test/database";
import { seedCanvases } from "@/test/seed/canvases";
import { seedColors } from "@/test/seed/colors";
import { seedEvents } from "@/test/seed/events";
import { seedUsers } from "@/test/seed/users";
import { CanvasService } from "./canvas.service";
import { CanvasCacheService } from "./canvas-cache.service";
import { PixelReconciliationService } from "./pixel-reconciliation.service";

const broadcastService = {
  broadcastCanvasInfo: vi.fn(),
  broadcastPixelsBulk: vi.fn(),
};

const pixelReconciliationService = {
  createBulkPlaceEntries: vi.fn(),
};

async function seedInfo() {
  await prisma.info.create({
    data: {
      title: "Canvas Test",
      canvasAdmin: [],
      currentEventId: 1,
      cachedCanvasIds: [],
      adminServerId: 1n,
      currentEmojiServerId: 1n,
      hostServerId: 1n,
      defaultCanvasId: 1,
    },
  });
}

describe("CanvasService", () => {
  let moduleRef: TestingModule;
  let service: CanvasService;
  let cacheService: CanvasCacheService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [
        CanvasService,
        CanvasCacheService,
        { provide: BroadcastService, useValue: broadcastService },
        {
          provide: PixelReconciliationService,
          useValue: pixelReconciliationService,
        },
      ],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(CanvasService);
    cacheService = moduleRef.get(CanvasCacheService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await seedEvents();
    await seedCanvases();
  });

  describe("getCanvases", () => {
    it("throws an error for a nonexistent canvas", async () => {
      await expect(service.getCanvasInfo(9999)).rejects.toThrow(NotFoundError);
    });

    it("returns all canvases", async () => {
      expect((await service.getCanvases()).length).toBe(2);
    });

    it("returns a summary of canvases sorted by last pixel activity (most recent first)", async () => {
      const canvases = await service.getCanvases();
      expect(canvases).toMatchObject([
        { id: 9, name: "Locked Canvas" },
        { id: 1, name: "Unlocked Canvas" },
      ]);
    });

    it("returns a canvas by ID", async () => {
      expect(await service.getCanvasInfo(1)).toMatchObject({
        id: 1,
        name: "Unlocked Canvas",
        width: 2,
        height: 2,
        placeState: CanvasPlaceState.Anyone,
        eventId: 1,
        startCoordinates: [1, 1],
      });
    });
  });

  describe("createCanvas", () => {
    beforeEach(async () => {
      await seedColors();
      await seedInfo();
      await resetSequence("canvas");
    });

    it("creates a canvas and seeds its pixels in the database", async () => {
      const canvasName = `Generated Canvas ${Date.now()}`;

      await service.createCanvas({
        name: canvasName,
        width: 3,
        height: 2,
      });

      const createdCanvas = await prisma.canvas.findFirst({
        where: { name: canvasName },
        select: {
          id: true,
          width: true,
          height: true,
        },
      });

      expect(createdCanvas).not.toBeNull();
      expect(createdCanvas).toMatchObject({
        width: 3,
        height: 2,
      });

      if (!createdCanvas) {
        throw new Error("Expected the canvas to be created");
      }

      const pixels = await cacheService.getCanvasPixels(
        createdCanvas.id,
        createdCanvas.width,
        createdCanvas.height,
      );
      expect(pixels).toHaveLength(6);
      expect(pixels).toStrictEqual([
        [88, 101, 242, 127],
        [88, 101, 242, 127],
        [88, 101, 242, 127],
        [88, 101, 242, 127],
        [88, 101, 242, 127],
        [88, 101, 242, 127],
      ]);

      expect(broadcastService.broadcastCanvasInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: createdCanvas.id,
          name: canvasName,
          width: 3,
          height: 2,
          placeState: CanvasPlaceState.NoOne,
          allColorsGlobal: false,
          cooldownDuration: 15,
        }),
      );
    });
  });

  describe("editCanvas", () => {
    it("updates the canvas fields in the database and broadcasts the new canvas info", async () => {
      await service.editCanvas({
        canvasId: 1,
        name: "Edited Canvas",
        placeState: CanvasPlaceState.NoOne,
        allColorsGlobal: true,
        cooldownDuration: 45,
      });

      const updatedCanvas = await prisma.canvas.findFirst({
        where: { id: 1 },
        select: {
          cooldownLength: true,
          allColorsGlobal: true,
        },
      });

      expect(updatedCanvas).toMatchObject({
        cooldownLength: 45,
        allColorsGlobal: true,
      });

      expect(broadcastService.broadcastCanvasInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: "Edited Canvas",
          placeState: CanvasPlaceState.NoOne,
          allColorsGlobal: true,
          cooldownDuration: 45,
        }),
      );
    });
  });

  describe("pasteCanvasData", () => {
    beforeEach(async () => {
      await seedColors();
    });

    it("throws an error for out-of-bounds coordinates", async () => {
      await expect(service.pasteCanvasData(1, 1n, [[5, 0, 1]])).rejects.toThrow(
        "out of bounds",
      );

      expect(
        pixelReconciliationService.createBulkPlaceEntries,
      ).not.toHaveBeenCalled();
    });

    it("throws an error for colors that are not in the event palette", async () => {
      // Color 3 is non-global and has no participation in event 1.
      await expect(service.pasteCanvasData(1, 1n, [[0, 0, 3]])).rejects.toThrow(
        "not in the event palette",
      );

      expect(
        pixelReconciliationService.createBulkPlaceEntries,
      ).not.toHaveBeenCalled();
    });

    it("throws an error for a canvas without an event", async () => {
      const canvas = await prisma.canvas.create({
        data: {
          name: "Eventless Canvas",
          placeState: CanvasPlaceState.Anyone,
          width: 2,
          height: 2,
          eventId: null,
          id: 50,
        },
      });

      await expect(
        service.pasteCanvasData(canvas.id, 1n, [[0, 0, 1]]),
      ).rejects.toThrow(UnprocessableError);
    });

    it("validates paste data and creates bulk history entries in the database", async () => {
      const authorId = 1n;

      await service.pasteCanvasData(1, authorId, [
        [0, 0, 1],
        [1, 1, 2],
      ]);

      expect(
        pixelReconciliationService.createBulkPlaceEntries,
      ).toHaveBeenCalledWith({
        canvasId: 1,
        userId: authorId,
        entries: [
          { x: 0, y: 0, colorId: 1 },
          { x: 1, y: 1, colorId: 2 },
        ],
      });
    });

    it("treats an empty paste as a no-op instead of crashing", async () => {
      await expect(service.pasteCanvasData(1, 1n, [])).resolves.toBeUndefined();

      expect(
        pixelReconciliationService.createBulkPlaceEntries,
      ).toHaveBeenCalledWith({
        canvasId: 1,
        userId: 1n,
        entries: [],
      });
    });
  });

  describe("getUserCanvasCooldown", () => {
    beforeEach(async () => {
      await seedUsers();
    });

    it("throws an error for a nonexistent canvas", async () => {
      await expect(service.getUserCanvasCooldown(9999, 1n)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("returns null if the user has no cooldown", async () => {
      expect(await service.getUserCanvasCooldown(1, 1n)).toBeNull();
    });

    it("returns the remaining cooldown time in milliseconds", async () => {
      await prisma.cooldown.create({
        data: {
          userId: 1n,
          canvasId: 1,
          cooldownTime: new Date(Date.now() + 30_000),
        },
      });

      const remaining = await service.getUserCanvasCooldown(1, 1n);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30_000);
    });

    it("returns null if the cooldown has elapsed", async () => {
      await prisma.cooldown.create({
        data: {
          userId: 1n,
          canvasId: 1,
          cooldownTime: new Date(Date.now() - 1_000),
        },
      });

      expect(await service.getUserCanvasCooldown(1, 1n)).toBeNull();
    });
  });
});

describe("CanvasService.computePasteArea", () => {
  it("returns the bounding box of the pasted pixels", () => {
    expect(
      CanvasService.computePasteArea([
        [3, 7, 1],
        [1, 9, 2],
        [5, 2, 3],
      ]),
    ).toEqual({ topLeftX: 1, topLeftY: 2, bottomRightX: 5, bottomRightY: 9 });
  });

  it("returns null for an empty paste", () => {
    expect(CanvasService.computePasteArea([])).toBeNull();
  });

  it("handles a single pixel", () => {
    expect(CanvasService.computePasteArea([[4, 8, 1]])).toEqual({
      topLeftX: 4,
      topLeftY: 8,
      bottomRightX: 4,
      bottomRightY: 8,
    });
  });

  it("does not overflow the call stack for very large pastes", () => {
    const data = Array.from(
      { length: 500_000 },
      (_, i) => [i % 1000, Math.floor(i / 1000), 1] as [number, number, number],
    );

    expect(() => CanvasService.computePasteArea(data)).not.toThrow();
    expect(CanvasService.computePasteArea(data)).toEqual({
      topLeftX: 0,
      topLeftY: 0,
      bottomRightX: 999,
      bottomRightY: 499,
    });
  });
});
