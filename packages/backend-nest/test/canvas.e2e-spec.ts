import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import sharp from "sharp";
import request from "supertest";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import { appConfig } from "@/config/app.config";
import { testPrisma as prisma } from "@/test/database";
import { seedCanvases } from "@/test/seed/canvases";
import { seedColors } from "@/test/seed/colors";
import { seedEvents } from "@/test/seed/events";
import { seedPixels } from "@/test/seed/pixels";

// The seeded 2x2 canvases are laid out as:
// [ blank, blurple ]
// [ red,   blank   ]
const BLANK = [88, 101, 242, 127];
const BLURPLE = [88, 101, 242, 255];
const RED = [234, 35, 40, 255];

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

describe("Canvas routes (e2e)", () => {
  let app: NestExpressApplication;
  let cacheService: CanvasCacheService;
  let canvasesPath: string;

  beforeAll(async () => {
    canvasesPath = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "canvas-e2e-"),
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(appConfig.KEY)
      .useValue({
        environment: "test",
        port: 3001,
        frontendUrl: "http://localhost:3000",
        paths: { root: canvasesPath, canvases: canvasesPath },
      })
      .compile();

    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();

    cacheService = app.get(CanvasCacheService);
  });

  afterAll(async () => {
    await app.close();
    await fs.promises.rm(canvasesPath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await seedEvents();
    await seedCanvases();
    await seedColors();
    await seedPixels();
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
  });

  afterEach(async () => {
    // The render cache outlives the per-test database transaction.
    await cacheService.clearCachedCanvas(1);
    await cacheService.clearCachedCanvas(9);
  });

  describe("GET /api/v1/canvas", () => {
    it("lists canvas summaries", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas")
        .expect(200);

      expect(response.body).toStrictEqual([
        {
          id: 9,
          name: "Locked Canvas",
          eventId: 9,
          isLocked: true,
          width: 2,
          height: 2,
          cooldownDuration: null,
        },
        {
          id: 1,
          name: "Unlocked Canvas",
          eventId: 1,
          isLocked: false,
          width: 2,
          height: 2,
          cooldownDuration: 30,
        },
      ]);
    });
  });

  describe("GET /api/v1/canvas/current/info", () => {
    it("returns the default canvas info", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas/current/info")
        .expect(200);

      expect(response.body).toStrictEqual({
        id: 1,
        name: "Unlocked Canvas",
        width: 2,
        height: 2,
        startCoordinates: [1, 1],
        isLocked: false,
        eventId: 1,
        webPlacingEnabled: false,
        allColorsGlobal: false,
        cooldownDuration: 30,
      });
    });
  });

  describe("GET /api/v1/canvas/:canvasId/info", () => {
    it("returns the canvas info", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas/9/info")
        .expect(200);

      expect(response.body).toMatchObject({
        id: 9,
        name: "Locked Canvas",
        isLocked: true,
        eventId: 9,
      });
    });

    it("returns the parity error envelope for an unknown canvas", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas/9999/info")
        .expect(404);

      expect(response.body).toStrictEqual({
        message: "There is no canvas with ID 9999",
      });
    });

    it("rejects a non-numeric canvas ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/canvas/oops/info")
        .expect(400);
    });
  });

  describe("PNG routes", () => {
    it("streams an unlocked canvas with the cache-defeating headers", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas/1")
        .responseType("blob")
        .expect(200);

      expect(response.headers["content-type"]).toBe("image/png");
      expect(response.headers["cache-control"]).toBe("no-cache, no-store");
      expect(response.headers.vary).toBe("*");
      expect(response.headers["content-disposition"]).toMatch(
        /^inline; filename="blurple-canvas__1__\d+\.png"$/,
      );

      const decoded = await decodePng(response.body as Buffer);
      expect(decoded).toStrictEqual({
        width: 2,
        height: 2,
        pixels: [BLANK, BLURPLE, RED, BLANK],
      });
    });

    it("serves the default canvas PNG on /current", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas/current")
        .responseType("blob")
        .expect(200);

      const decoded = await decodePng(response.body as Buffer);
      expect(decoded).toMatchObject({ width: 2, height: 2 });
    });

    it("matches the @:scale.png route pattern and scales the image", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas/1@2.png")
        .responseType("blob")
        .expect(200);

      expect(response.headers["content-type"]).toBe("image/png");
      expect(response.headers["content-disposition"]).toMatch(
        /^inline; filename="blurple-canvas__1__\d+@2x\.png"$/,
      );

      const decoded = await decodePng(response.body as Buffer);
      expect(decoded).toMatchObject({ width: 4, height: 4 });
      // Nearest-neighbour upscale: the top-right quadrant is all blurple.
      expect(decoded.pixels[2]).toStrictEqual(BLURPLE);
      expect(decoded.pixels[3]).toStrictEqual(BLURPLE);
    });

    it("crops the export when bounds are passed", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas/1@1.png?x0=1&y0=0&x1=2&y1=1")
        .responseType("blob")
        .expect(200);

      const decoded = await decodePng(response.body as Buffer);
      expect(decoded).toStrictEqual({
        width: 1,
        height: 1,
        pixels: [BLURPLE],
      });
    });

    it("rejects an invalid scale", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/canvas/1@3.png")
        .expect(400);
    });

    it("rejects partial crop bounds", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/canvas/1@1.png?x0=0&y0=0")
        .expect(400);
    });

    it("serves a locked canvas", async () => {
      const firstResponse = await request(app.getHttpServer())
        .get("/api/v1/canvas/9")
        .responseType("blob")
        .expect(200);

      expect(firstResponse.headers["content-type"]).toBe("image/png");
      const decoded = await decodePng(firstResponse.body as Buffer);
      expect(decoded).toStrictEqual({
        width: 2,
        height: 2,
        pixels: [BLANK, BLURPLE, RED, BLANK],
      });

      // The second request is served from the materialised file.
      const secondResponse = await request(app.getHttpServer())
        .get("/api/v1/canvas/9")
        .responseType("blob")
        .expect(200);

      expect(secondResponse.headers["content-type"]).toBe("image/png");
      expect(await decodePng(secondResponse.body as Buffer)).toStrictEqual(
        decoded,
      );
    });

    it("returns 404 for a nonexistent canvas", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas/9999")
        .expect(404);

      expect(response.body).toStrictEqual({
        message: "There is no canvas with ID 9999",
      });
    });
  });

  describe("guarded routes", () => {
    it("requires login for the cooldown route", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/canvas/1/cooldown/@me")
        .expect(401);
    });

    it("requires authentication for the admin routes", async () => {
      const server = app.getHttpServer();

      await request(server)
        .post("/api/v1/canvas")
        .send({ name: "New Canvas", width: 2, height: 2 })
        .expect(401);

      await request(server)
        .put("/api/v1/canvas/1")
        .send({ name: "Updated" })
        .expect(401);

      await request(server)
        .post("/api/v1/canvas/1/paste")
        .send({ authorId: "123456789012345678", data: [[0, 0, 1]] })
        .expect(401);

      await request(server).delete("/api/v1/canvas/1/cache").expect(401);
    });
  });
});
