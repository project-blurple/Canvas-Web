import fs from "node:fs";
import path from "node:path";
import { CanvasPlaceState } from "@blurple-canvas-web/types";
import sharp from "sharp";
import { prisma } from "@/client";
import config from "@/config";
import { seedCanvases, seedColors, seedEvents } from "@/test";
import {
  createCanvas,
  getCanvasFilename,
  getCanvasPng,
  getLockedCanvasPath,
} from "./canvasService";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastCanvasUpdate: vi.fn(),
    broadcastPixelPlacement: vi.fn(),
    broadcastPixelBulkPlacement: vi.fn(),
  },
}));

describe("Canvas cache concurrency tests", () => {
  beforeEach(async () => {
    await seedColors();
  });

  it("deduplicates concurrent cache misses for the same canvas", async () => {
    const createdCanvas = await prisma.canvas.create({
      data: {
        name: "Concurrent Cache Canvas",
        place_state: CanvasPlaceState.Anyone,
        width: 2,
        height: 2,
        event_id: null,
      },
    });

    await prisma.pixel.createMany({
      data: [
        { canvas_id: createdCanvas.id, x: 0, y: 0, color_id: 1 },
        { canvas_id: createdCanvas.id, x: 1, y: 0, color_id: 1 },
        { canvas_id: createdCanvas.id, x: 0, y: 1, color_id: 1 },
        { canvas_id: createdCanvas.id, x: 1, y: 1, color_id: 1 },
      ],
    });

    const findFirstSpy = vi.spyOn(prisma.canvas, "findFirst");
    const findManySpy = vi.spyOn(prisma.pixel, "findMany");

    try {
      const [firstCanvas, secondCanvas] = await Promise.all([
        getCanvasPng(createdCanvas.id),
        getCanvasPng(createdCanvas.id),
      ]);

      expect(firstCanvas).toStrictEqual(secondCanvas);
      expect(firstCanvas.placeState).toBe(CanvasPlaceState.Anyone);
      expect(findFirstSpy).toHaveBeenCalledTimes(1);
      expect(findManySpy).toHaveBeenCalledTimes(1);
    } finally {
      await prisma.pixel.deleteMany({
        where: { canvas_id: createdCanvas.id },
      });
      await prisma.canvas.delete({
        where: { id: createdCanvas.id },
      });
    }
  });
});

describe("Locked canvas PNG cache tests", () => {
  beforeEach(async () => {
    await seedEvents();
    await seedCanvases();
    await seedColors();
    await prisma.info.create({
      data: {
        title: "Canvas Test",
        canvas_admin: [],
        current_event_id: 1,
        cached_canvas_ids: [],
        admin_server_id: BigInt(1),
        current_emoji_server_id: BigInt(1),
        host_server_id: BigInt(1),
        default_canvas_id: 1,
      },
    });
  });

  it("creates and reuses 1x, 2x, and 4x locked canvas files", async () => {
    const createdCanvas = await createCanvas({
      name: `Locked Canvas ${Date.now()}`,
      width: 2,
      height: 2,
    });

    try {
      await getCanvasPng(createdCanvas.id);

      const canvas = await getCanvasPng(createdCanvas.id);

      if (canvas.placeState !== CanvasPlaceState.NoOne) {
        throw new Error("Expected locked canvas cache entries");
      }

      expect(canvas).toMatchObject({
        placeState: CanvasPlaceState.NoOne,
        canvasPaths: expect.objectContaining({
          1: expect.stringContaining(getCanvasFilename(createdCanvas.id, true)),
          2: expect.stringContaining(
            getCanvasFilename(createdCanvas.id, true, 2),
          ),
          4: expect.stringContaining(
            getCanvasFilename(createdCanvas.id, true, 4),
          ),
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

      for (const size of [1, 2, 4] as const) {
        expect(
          fs.existsSync(
            path.join(
              config.paths.canvases,
              getCanvasFilename(createdCanvas.id, true, size),
            ),
          ),
        ).toBe(true);
      }
    } finally {
      await prisma.pixel.deleteMany({
        where: { canvas_id: createdCanvas.id },
      });
      await prisma.canvas.delete({
        where: { id: createdCanvas.id },
      });

      await Promise.all(
        ([1, 2, 4] as const).map(async (size) => {
          await fs.promises.rm(
            path.join(
              config.paths.canvases,
              getCanvasFilename(createdCanvas.id, true, size),
            ),
            { force: true },
          );
        }),
      );
    }
  });
});
