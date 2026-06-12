import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Test, type TestingModule } from "@nestjs/testing";
import sharp from "sharp";

import { DatabaseModule } from "@/common/database/database.module";
import { appConfig } from "@/config/app.config";
import { AppConfigModule } from "@/config/config.module";
import { testPrisma as prisma } from "@/test/database";
import { seedCanvases } from "@/test/seed/canvases";
import { seedColors } from "@/test/seed/colors";
import { seedEvents } from "@/test/seed/events";
import { seedPixels } from "@/test/seed/pixels";
import { CanvasCacheService } from "./canvas-cache.service";
import { getCanvasFilename, getLockedCanvasPath } from "./canvas-image.util";

describe("CanvasCacheService", () => {
  let moduleRef: TestingModule;
  let service: CanvasCacheService;
  let canvasesPath: string;

  beforeEach(async () => {
    canvasesPath = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "canvas-cache-"),
    );

    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [CanvasCacheService],
    })
      .overrideProvider(appConfig.KEY)
      .useValue({
        environment: "test",
        port: 3001,
        frontendUrl: "http://localhost:3000",
        paths: { root: canvasesPath, canvases: canvasesPath },
      })
      .compile();

    service = moduleRef.get(CanvasCacheService);

    await seedEvents();
    await seedCanvases();
    await seedColors();
    await seedPixels();
  });

  afterEach(async () => {
    await moduleRef.close();
    await fs.promises.rm(canvasesPath, { recursive: true, force: true });
  });

  /** Writes a locked canvas PNG into the canvases directory. */
  async function writeLockedCanvasFile(
    canvasId: number,
    scale: 1 | 2 | 4,
  ): Promise<string> {
    const filePath = path.join(
      canvasesPath,
      getCanvasFilename(canvasId, true, scale),
    );

    await sharp(Buffer.alloc(2 * scale * 2 * scale * 4), {
      raw: { width: 2 * scale, height: 2 * scale, channels: 4 },
    })
      .png()
      .toFile(filePath);

    return filePath;
  }

  describe("single-flight loads", () => {
    it("deduplicates concurrent cache misses for the same canvas", async () => {
      const getCanvasPixelsSpy = vi.spyOn(service, "getCanvasPixels");

      const [firstCanvas, secondCanvas] = await Promise.all([
        service.getCanvasPng(1),
        service.getCanvasPng(1),
      ]);

      expect(firstCanvas).toStrictEqual(secondCanvas);
      expect(firstCanvas.isLocked).toBe(false);
      expect(getCanvasPixelsSpy).toHaveBeenCalledTimes(1);
    });

    it("serves subsequent requests from the cache without a database load", async () => {
      await service.getCanvasPng(1);

      const getCanvasPixelsSpy = vi.spyOn(service, "getCanvasPixels");
      const cached = await service.getCanvasPng(1);

      expect(cached.isLocked).toBe(false);
      expect(getCanvasPixelsSpy).not.toHaveBeenCalled();
    });
  });

  describe("locked canvas PNG cache", () => {
    it("creates and reuses 1x, 2x, and 4x locked canvas files", async () => {
      await service.getCanvasPng(9);

      const canvas = await service.getCanvasPng(9);

      if (!canvas.isLocked) {
        throw new Error("Expected locked canvas cache entries");
      }

      expect(canvas).toMatchObject({
        isLocked: true,
        canvasPaths: expect.objectContaining({
          1: expect.stringContaining(getCanvasFilename(9, true)),
          2: expect.stringContaining(getCanvasFilename(9, true, 2)),
          4: expect.stringContaining(getCanvasFilename(9, true, 4)),
        }),
      });

      const canvas1xPath = getLockedCanvasPath(canvas.canvasPaths, 1);
      const canvas2xPath = getLockedCanvasPath(canvas.canvasPaths, 2);
      const canvas4xPath = getLockedCanvasPath(canvas.canvasPaths, 4);

      if (!canvas1xPath || !canvas2xPath || !canvas4xPath) {
        throw new Error("Expected locked canvas paths to exist");
      }

      expect(await sharp(canvas1xPath).metadata()).toMatchObject({
        width: 2,
        height: 2,
      });

      expect(await sharp(canvas2xPath).metadata()).toMatchObject({
        width: 4,
        height: 4,
      });

      expect(await sharp(canvas4xPath).metadata()).toMatchObject({
        width: 8,
        height: 8,
      });

      for (const scale of [1, 2, 4] as const) {
        expect(
          fs.existsSync(
            path.join(canvasesPath, getCanvasFilename(9, true, scale)),
          ),
        ).toBe(true);
      }
    });

    it("evicts the in-memory entry and on-disk files", async () => {
      await service.getCanvasPng(9);

      await service.clearCachedCanvas(9);

      for (const scale of [1, 2, 4] as const) {
        expect(
          fs.existsSync(
            path.join(canvasesPath, getCanvasFilename(9, true, scale)),
          ),
        ).toBe(false);
      }

      // The next access is a cache miss and regenerates the files.
      const getCanvasPixelsSpy = vi.spyOn(service, "getCanvasPixels");
      await service.getCanvasPng(9);
      expect(getCanvasPixelsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("lock-state reconciliation", () => {
    it("removes the on-disk files when a cached canvas is unlocked", async () => {
      await service.getCanvasPng(9);
      const lockedCanvas = await service.getCanvasPng(9);
      if (!lockedCanvas.isLocked) {
        throw new Error("Expected locked canvas cache entries");
      }

      await prisma.canvas.update({
        where: { id: 9 },
        data: { locked: false },
      });

      const refreshed = await service.getCanvasPng(9);
      expect(refreshed.isLocked).toBe(false);

      for (const scale of [1, 2, 4] as const) {
        expect(
          fs.existsSync(
            path.join(canvasesPath, getCanvasFilename(9, true, scale)),
          ),
        ).toBe(false);
      }
    });

    it("materialises the files when a cached canvas is locked", async () => {
      const unlockedCanvas = await service.getCanvasPng(1);
      expect(unlockedCanvas.isLocked).toBe(false);

      await prisma.canvas.update({
        where: { id: 1 },
        data: { locked: true },
      });

      await service.getCanvasPng(1);
      const lockedCanvas = await service.getCanvasPng(1);

      expect(lockedCanvas.isLocked).toBe(true);
      for (const scale of [1, 2, 4] as const) {
        expect(
          fs.existsSync(
            path.join(canvasesPath, getCanvasFilename(1, true, scale)),
          ),
        ).toBe(true);
      }
    });
  });

  describe("boot scan", () => {
    it("loads locked canvas files from the file system", async () => {
      const paths = await Promise.all(
        ([1, 2, 4] as const).map((scale) => writeLockedCanvasFile(9, scale)),
      );

      service.initializeCache();

      const getCanvasPixelsSpy = vi.spyOn(service, "getCanvasPixels");
      const canvas = await service.getCanvasPng(9);

      expect(canvas).toStrictEqual({
        isLocked: true,
        canvasPaths: { 1: paths[0], 2: paths[1], 4: paths[2] },
      });
      expect(getCanvasPixelsSpy).not.toHaveBeenCalled();
    });

    it("regenerates all sizes when a cached locked canvas misses a scale", async () => {
      // Only the 1x file is present, so the boot scan produces an incomplete
      // cache entry.
      await writeLockedCanvasFile(9, 1);
      service.initializeCache();

      const getCanvasPixelsSpy = vi.spyOn(service, "getCanvasPixels");
      await service.getCanvasPng(9);
      expect(getCanvasPixelsSpy).toHaveBeenCalledTimes(1);

      const canvas = await service.getCanvasPng(9);
      if (!canvas.isLocked) {
        throw new Error("Expected locked canvas cache entries");
      }

      for (const scale of [1, 2, 4] as const) {
        const canvasPath = getLockedCanvasPath(canvas.canvasPaths, scale);
        expect(canvasPath).toBeDefined();
        expect(fs.existsSync(canvasPath as string)).toBe(true);
      }

      expect(
        await sharp(getLockedCanvasPath(canvas.canvasPaths, 4)).metadata(),
      ).toMatchObject({ width: 8, height: 8 });
    });
  });

  describe("cached pixel updates", () => {
    it("updates pixels of an unlocked cached canvas in place", async () => {
      const cached = await service.getCanvasPng(1);
      if (cached.isLocked) {
        throw new Error("Expected an unlocked canvas");
      }

      service.updateCachedCanvasPixel(1, { x: 0, y: 0 }, [1, 2, 3, 4]);
      expect(cached.pixels[0]).toStrictEqual([1, 2, 3, 4]);

      service.updateManyCachedPixels(1, [
        { x: 1, y: 0, rgba: [5, 6, 7, 8] },
        { x: 0, y: 1, rgba: [9, 10, 11, 12] },
      ]);
      expect(cached.pixels[1]).toStrictEqual([5, 6, 7, 8]);
      expect(cached.pixels[2]).toStrictEqual([9, 10, 11, 12]);
    });

    it("ignores pixel updates for locked or uncached canvases", async () => {
      await service.getCanvasPng(9);
      const locked = await service.getCanvasPng(9);
      expect(locked.isLocked).toBe(true);

      expect(() => {
        service.updateCachedCanvasPixel(9, { x: 0, y: 0 }, [1, 2, 3, 4]);
        service.updateCachedCanvasPixel(404, { x: 0, y: 0 }, [1, 2, 3, 4]);
      }).not.toThrow();
    });
  });
});
