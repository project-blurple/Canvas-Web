import fs from "node:fs";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { CanvasPlaceState, SocketEvents } from "@blurple-canvas-web/types";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import {
  ThrottlerStorage,
  type ThrottlerStorageService,
} from "@nestjs/throttler";
import sharp from "sharp";
import { io, type Socket } from "socket.io-client";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import { appConfig } from "@/config/app.config";
import { placementConfig } from "@/config/placement.config";
import { testPrisma as prisma } from "@/test/database";
import { seedCanvases } from "@/test/seed/canvases";
import { seedColors } from "@/test/seed/colors";
import { seedEvents } from "@/test/seed/events";
import { seedGuilds } from "@/test/seed/guilds";
import { seedPixels } from "@/test/seed/pixels";
import { seedUsers } from "@/test/seed/users";
import {
  MANAGED_GUILD_ID,
  MANAGEMENT_GUILD_ID,
  MOCK_DISCORD_USER_ID,
  mockDiscordServer,
  onUnhandledRequest,
  PLAIN_GUILD_ID,
  resetMockDiscord,
  VALID_OAUTH_CODE,
} from "./mock-discord";

const BOT_API_KEY = "test-bot-key";

// The seeded 2x2 canvases are laid out as:
// [ blank, blurple ]
// [ red,   blank   ]
const BLANK = [88, 101, 242, 127];
const BLURPLE = [88, 101, 242, 255];
const RED = [234, 35, 40, 255];
const BLUE = [0, 90, 166, 255];

async function decodePng(png: Buffer): Promise<number[][]> {
  const { data } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: number[][] = [];
  for (let index = 0; index < data.length; index += 4) {
    pixels.push([...data.subarray(index, index + 4)]);
  }

  return pixels;
}

/**
 * Runs the OAuth callback leg on the agent so it holds a logged-in session,
 * then waits for the fire-and-forget guild-record sync (it runs after the
 * redirect is sent) so it cannot race the per-test transaction rollback.
 */
async function signIn(agent: TestAgent): Promise<void> {
  const response = await agent.get(
    `/api/v1/discord/callback?code=${VALID_OAUTH_CODE}`,
  );

  expect(response.status).toBe(302);

  await vi.waitFor(async () => {
    const syncedGuilds = await prisma.discordGuildRecord.count({
      where: {
        guildId: {
          in: [MANAGEMENT_GUILD_ID, MANAGED_GUILD_ID, PLAIN_GUILD_ID].map(
            BigInt,
          ),
        },
      },
    });
    expect(syncedGuilds).toBe(3);
  });
}

describe("Pixel routes (e2e)", () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let cacheService: CanvasCacheService;
  let canvasesPath: string;
  let throttlerStorage: ThrottlerStorageService;
  const clients: Socket[] = [];

  // Mutated per-test to exercise the feature flags; reset in beforeEach.
  const placementCfg = {
    webGuildId: 0,
    webPlacingEnabled: true,
    botPlacingEnabled: true,
    botApiKey: BOT_API_KEY,
  };

  beforeAll(async () => {
    mockDiscordServer.listen({ onUnhandledRequest });

    canvasesPath = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "pixel-e2e-"),
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
      .overrideProvider(placementConfig.KEY)
      .useValue(placementCfg)
      .compile();

    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    // The gateway needs a listening HTTP server for real socket connections.
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;

    cacheService = app.get(CanvasCacheService);
    throttlerStorage = app.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  afterAll(async () => {
    await app.close();
    mockDiscordServer.close();
    await fs.promises.rm(canvasesPath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    placementCfg.webPlacingEnabled = true;
    placementCfg.botPlacingEnabled = true;

    await seedEvents();
    await seedUsers();
    await seedGuilds();
    await seedCanvases();
    await seedColors();
    await seedPixels();
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    mockDiscordServer.resetHandlers();
    resetMockDiscord();
    // Rate-limit state is in-process and shared across tests; reset it so the
    // per-user placement budget does not leak between cases.
    throttlerStorage.onApplicationShutdown();
    throttlerStorage.storage.clear();
    // The render cache outlives the per-test database transaction.
    await cacheService.clearCachedCanvas(1);
  });

  /** Connects a socket client and collects every `placePixel` event for the canvas. */
  async function collectPixelEvents(canvasId: number): Promise<unknown[]> {
    const client = io(baseUrl);
    clients.push(client);

    const events: unknown[] = [];
    client.on(SocketEvents.placePixel(canvasId), (payload: unknown) => {
      events.push(payload);
    });

    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", reject);
    });

    return events;
  }

  async function fetchCanvasPixels(
    agent: TestAgent,
    canvasId: number,
  ): Promise<number[][]> {
    const response = await agent
      .get(`/api/v1/canvas/${canvasId}`)
      .responseType("blob")
      .expect(200);

    return await decodePng(response.body as Buffer);
  }

  describe("POST /api/v1/canvas/:canvasId/pixel", () => {
    it("places the pixel, emits exactly one socket event, and appends one history row", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      // Prime the render cache so the placement exercises the cache update.
      expect(await fetchCanvasPixels(agent, 1)).toStrictEqual([
        BLANK,
        BLURPLE,
        RED,
        BLANK,
      ]);

      const events = await collectPixelEvents(1);
      const historyBefore = await prisma.history.count();

      const response = await agent
        .post("/api/v1/canvas/1/pixel")
        .send({ x: 0, y: 0, colorId: 2 })
        .expect(201);

      expect(response.body.cooldownEndTime).toBeGreaterThan(0);
      expect(response.body.cooldownEndTime).toBeLessThanOrEqual(30_000);

      // Exactly one history row, attributed to the web guild ID 0.
      expect(await prisma.history.count()).toBe(historyBefore + 1);
      const entries = await prisma.history.findMany({
        where: { canvasId: 1, x: 0, y: 0, colorId: 2 },
      });
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        userId: BigInt(MOCK_DISCORD_USER_ID),
        guildId: 0n,
      });

      // Exactly one socket event.
      await vi.waitFor(() => expect(events).toHaveLength(1));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(events).toStrictEqual([{ x: 0, y: 0, rgba: BLURPLE }]);

      // The placed pixel is visible in the next canvas PNG fetch.
      expect(await fetchCanvasPixels(agent, 1)).toStrictEqual([
        BLURPLE,
        BLURPLE,
        RED,
        BLANK,
      ]);

      // And the cooldown read reflects the placement.
      const cooldownResponse = await agent
        .get("/api/v1/canvas/1/cooldown/@me")
        .expect(200);
      expect(cooldownResponse.body.cooldownEndTime).toBeGreaterThan(0);
    });

    it("rejects a second placement within the cooldown window", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const historyBefore = await prisma.history.count();

      await agent
        .post("/api/v1/canvas/1/pixel")
        .send({ x: 0, y: 0, colorId: 2 })
        .expect(201);

      const response = await agent
        .post("/api/v1/canvas/1/pixel")
        .send({ x: 1, y: 1, colorId: 2 })
        .expect(403);

      expect(response.body).toStrictEqual({
        message: "Pixel placement is on cooldown",
      });
      expect(await prisma.history.count()).toBe(historyBefore + 1);
    });

    it("requires login", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/canvas/1/pixel")
        .send({ x: 0, y: 0, colorId: 2 })
        .expect(401);
    });

    it("rejects placement when web placing is disabled", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      placementCfg.webPlacingEnabled = false;

      const response = await agent
        .post("/api/v1/canvas/1/pixel")
        .send({ x: 0, y: 0, colorId: 2 })
        .expect(403);

      expect(response.body).toStrictEqual({
        message: "Web placing is disabled",
      });
    });

    it("rejects blocklisted users", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await prisma.blacklist.create({
        data: { userId: BigInt(MOCK_DISCORD_USER_ID) },
      });

      const response = await agent
        .post("/api/v1/canvas/1/pixel")
        .send({ x: 0, y: 0, colorId: 2 })
        .expect(403);

      expect(response.body).toStrictEqual({ message: "User is blocklisted" });
    });

    it("rejects an invalid body", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await agent
        .post("/api/v1/canvas/1/pixel")
        .send({ x: -1, y: 0, colorId: 2 })
        .expect(400);
    });

    it("rejects placement on a soft-locked canvas for a user with no existing placements", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await prisma.canvas.update({
        where: { id: 1 },
        data: { placeState: CanvasPlaceState.NoNewUsers },
      });

      const response = await agent
        .post("/api/v1/canvas/1/pixel")
        .send({ x: 0, y: 0, colorId: 2 })
        .expect(403);

      expect(response.body).toStrictEqual({
        message:
          "This canvas is soft-locked. Only users with existing placements may place pixels.",
      });
      expect(await prisma.history.count({ where: { canvasId: 1 } })).toBe(0);
    });

    it("allows placement on a soft-locked canvas for a user with an existing placement", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await prisma.canvas.update({
        where: { id: 1 },
        data: { placeState: CanvasPlaceState.NoNewUsers },
      });
      await prisma.history.create({
        data: {
          canvasId: 1,
          userId: BigInt(MOCK_DISCORD_USER_ID),
          x: 1,
          y: 0,
          colorId: 2,
          timestamp: new Date(),
        },
      });

      const response = await agent
        .post("/api/v1/canvas/1/pixel")
        .send({ x: 0, y: 0, colorId: 2 })
        .expect(201);

      expect(response.body.cooldownEndTime).toBeGreaterThan(0);
      const placed = await prisma.history.findFirst({
        where: { canvasId: 1, x: 0, y: 0, colorId: 2 },
      });
      expect(placed?.userId).toBe(BigInt(MOCK_DISCORD_USER_ID));
    });
  });

  describe("POST /api/v1/canvas/:canvasId/pixel/bot", () => {
    it("updates the cache and broadcasts without writing to the database", async () => {
      const agent = request.agent(app.getHttpServer());

      // Prime the render cache so the bot update has a canvas to mutate.
      await fetchCanvasPixels(agent, 1);

      const events = await collectPixelEvents(1);
      const historyBefore = await prisma.history.count();

      await agent
        .post("/api/v1/canvas/1/pixel/bot")
        .set("x-api-key", BOT_API_KEY)
        .send([
          { x: 0, y: 0, rgba: BLUE },
          { x: 1, y: 1, rgba: BLUE },
        ])
        .expect(204);

      // The cache (and therefore the PNG) reflects the bot's pixels…
      expect(await fetchCanvasPixels(agent, 1)).toStrictEqual([
        BLUE,
        BLURPLE,
        RED,
        BLUE,
      ]);

      // …but nothing was written to the database.
      expect(await prisma.history.count()).toBe(historyBefore);
      const pixel = await prisma.pixel.findFirst({
        where: { canvasId: 1, x: 0, y: 0 },
      });
      expect(pixel?.colorId).toBe(1);

      // One broadcast per pixel.
      await vi.waitFor(() => expect(events).toHaveLength(2));
      expect(events).toStrictEqual([
        { x: 0, y: 0, rgba: BLUE },
        { x: 1, y: 1, rgba: BLUE },
      ]);
    });

    it("rejects an invalid API key", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/canvas/1/pixel/bot")
        .set("x-api-key", "wrong-key")
        .send([{ x: 0, y: 0, rgba: BLUE }])
        .expect(401);

      expect(response.body).toStrictEqual({ message: "Invalid API key" });
    });

    it("rejects a missing API key", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/canvas/1/pixel/bot")
        .send([{ x: 0, y: 0, rgba: BLUE }])
        .expect(401);
    });

    it("rejects the update when bot placing is disabled", async () => {
      placementCfg.botPlacingEnabled = false;

      const response = await request(app.getHttpServer())
        .post("/api/v1/canvas/1/pixel/bot")
        .set("x-api-key", BOT_API_KEY)
        .send([{ x: 0, y: 0, rgba: BLUE }])
        .expect(403);

      expect(response.body).toStrictEqual({
        message: "Bot placing is disabled",
      });
    });

    it("rejects malformed pixels", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/canvas/1/pixel/bot")
        .set("x-api-key", BOT_API_KEY)
        .send([{ x: 0, y: 0, rgba: [0, 90, 166] }])
        .expect(400);
    });
  });
});
