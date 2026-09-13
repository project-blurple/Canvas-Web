import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CanvasPlaceState } from "@blurple-canvas-web/types";
import { Test, type TestingModule } from "@nestjs/testing";
import sharp from "sharp";
import { DatabaseModule } from "@/common/database/database.module";
import { BadRequestError } from "@/common/errors/bad-request.error";
import { appConfig } from "@/config/app.config";
import { AppConfigModule } from "@/config/config.module";
import { seedCanvases } from "@/test/seed/canvases";
import { seedColors } from "@/test/seed/colors";
import { seedEvents } from "@/test/seed/events";
import { seedPixels } from "@/test/seed/pixels";
import { CanvasCacheService } from "./canvas-cache.service";
import { ExportService } from "./export.service";

// The seeded 2x2 canvases are laid out as:
// [ blank, blurple ]
// [ red,   blank   ]
const BLANK = [88, 101, 242, 127] as const;
const BLURPLE = [88, 101, 242, 255] as const;
const RED = [234, 35, 40, 255] as const;

// Resizing premultiplies the alpha channel, so semi-transparent pixels pick
// up a rounding error — the same as the old backend's sharp pipeline.
const BLANK_SCALED = [86, 100, 240, 127] as const;

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/** Decodes a PNG into a list of `[r, g, b, a]` pixels. */
async function decodePng(
  png: Buffer,
): Promise<{ width: number; height: number; pixels: number[][] }> {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: number[][] = [];
  for (let index = 0; index < data.length; index += 4) {
    pixels.push([...data.subarray(index, index + 4)]);
  }

  return { width: info.width, height: info.height, pixels };
}

describe("ExportService", () => {
  let moduleRef: TestingModule;
  let service: ExportService;
  let cacheService: CanvasCacheService;
  let canvasesPath: string;

  beforeEach(async () => {
    canvasesPath = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "canvas-export-"),
    );

    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [CanvasCacheService, ExportService],
    })
      .overrideProvider(appConfig.KEY)
      .useValue({
        environment: "test",
        port: 3001,
        frontendUrl: "http://localhost:3000",
        paths: { root: canvasesPath, canvases: canvasesPath },
      })
      .compile();

    service = moduleRef.get(ExportService);
    cacheService = moduleRef.get(CanvasCacheService);

    await seedEvents();
    await seedCanvases();
    await seedColors();
    await seedPixels();
  });

  afterEach(async () => {
    await moduleRef.close();
    await fs.promises.rm(canvasesPath, { recursive: true, force: true });
  });

  it("exports the full bounds of an unlocked canvas", async () => {
    const stream = await service.exportCanvasBoundsAsStream({
      canvasId: 1,
      x0: 0,
      y0: 0,
      x1: 1,
      y1: 1,
    });

    const decoded = await decodePng(await streamToBuffer(stream));

    expect(decoded).toStrictEqual({
      width: 2,
      height: 2,
      pixels: [BLANK, BLURPLE, RED, BLANK],
    });
  });

  it("exports a cropped region of an unlocked canvas", async () => {
    const stream = await service.exportCanvasBoundsAsStream({
      canvasId: 1,
      x0: 1,
      y0: 0,
      x1: 1,
      y1: 0,
    });

    const decoded = await decodePng(await streamToBuffer(stream));

    expect(decoded).toStrictEqual({
      width: 1,
      height: 1,
      pixels: [BLURPLE],
    });
  });

  it("scales an unlocked export with nearest-neighbour", async () => {
    const stream = await service.exportCanvasBoundsAsStream({
      canvasId: 1,
      x0: 0,
      y0: 1,
      x1: 1,
      y1: 1,
      scale: 2,
    });

    const png = await streamToBuffer(stream);
    const decoded = await decodePng(png);

    // The [red, blank] row, doubled in both directions.
    const scaledRow = [RED, RED, BLANK_SCALED, BLANK_SCALED];
    expect(decoded).toStrictEqual({
      width: 4,
      height: 2,
      pixels: [...scaledRow, ...scaledRow],
    });

    expect(await sharp(png).metadata()).toMatchObject({
      density: 144,
      icc: expect.any(Buffer),
    });
  });

  it("extracts the crop from the materialised file of a locked canvas", async () => {
    // Prime the cache so the locked canvas files exist on disk.
    await cacheService.getCanvasPng(9);
    const cached = await cacheService.getCanvasPng(9);
    expect(cached.placeState).toBe(CanvasPlaceState.NoOne);

    const stream = await service.exportCanvasBoundsAsStream({
      canvasId: 9,
      x0: 0,
      y0: 1,
      x1: 1,
      y1: 1,
      scale: 2,
    });

    const png = await streamToBuffer(stream);
    const decoded = await decodePng(png);

    const scaledRow = [RED, RED, BLANK_SCALED, BLANK_SCALED].map((color) => [
      ...color,
    ]);
    expect(decoded).toStrictEqual({
      width: 4,
      height: 2,
      pixels: [...scaledRow, ...scaledRow],
    });

    expect(await sharp(png).metadata()).toMatchObject({
      density: 144,
      icc: expect.any(Buffer),
    });
  });

  it("rejects empty crop dimensions", async () => {
    // Inverted bounds (x1 < x0 / y1 < y0) yield a non-positive inclusive size.
    await expect(
      service.exportCanvasBoundsAsStream({
        canvasId: 1,
        x0: 1,
        y0: 0,
        x1: 0,
        y1: 1,
      }),
    ).rejects.toThrow(BadRequestError);

    await expect(
      service.exportCanvasBoundsAsStream({
        canvasId: 1,
        x0: 0,
        y0: 1,
        x1: 1,
        y1: 0,
      }),
    ).rejects.toThrow(BadRequestError);
  });
});
