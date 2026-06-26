import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import {
  ThrottlerStorage,
  type ThrottlerStorageService,
} from "@nestjs/throttler";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import { appConfig } from "@/config/app.config";
import { placementConfig } from "@/config/placement.config";
import { RATE_LIMITS } from "@/rate-limit/rate-limit.constants";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";
import {
  MOCK_DISCORD_USER_ID,
  mockDiscord,
  mockDiscordServer,
  onUnhandledRequest,
  resetMockDiscord,
  VALID_OAUTH_CODE,
} from "./mock-discord";

const BOT_API_KEY = "test-bot-key";
const OWNED_FRAME_ID = "aaaaaa";

/** The envelope `ApiExceptionFilter` produces for a throttled request. */
const RATE_LIMITED = { message: "You have been rate limited" };

async function signIn(agent: TestAgent): Promise<void> {
  const response = await agent.get(
    `/api/v1/discord/callback?code=${VALID_OAUTH_CODE}`,
  );
  expect(response.status).toBe(302);

  // The guild-record sync is fire-and-forget; wait for it so it cannot race the
  // per-test transaction rollback.
  await vi.waitFor(async () => {
    const synced = await prisma.discordGuildRecord.count();
    expect(synced).toBeGreaterThan(0);
  });
}

async function seedOwnedFrame(): Promise<void> {
  await prisma.frame.create({
    data: {
      id: OWNED_FRAME_ID,
      canvasId: 1,
      ownerUserId: BigInt(MOCK_DISCORD_USER_ID),
      name: "My Frame",
      x0: 0,
      y0: 0,
      x1: 1,
      y1: 1,
    },
  });
}

function placePixel(agent: TestAgent) {
  return agent.post("/api/v1/canvas/1/pixel").send({ x: 0, y: 0, colorId: 2 });
}

async function drainBudget(
  limit: number,
  makeRequest: () => request.Test,
): Promise<void> {
  for (let attempt = 0; attempt < limit; attempt++) {
    const response = await makeRequest();
    expect(response.status).not.toBe(429);
  }
}

describe("Rate limiting (e2e)", () => {
  let app: NestExpressApplication;
  let cacheService: CanvasCacheService;
  let canvasesPath: string;
  let throttlerStorage: ThrottlerStorageService;

  const placementCfg = {
    webGuildId: 0,
    webPlacingEnabled: true,
    botPlacingEnabled: true,
    botApiKey: BOT_API_KEY,
  };

  beforeAll(async () => {
    mockDiscordServer.listen({ onUnhandledRequest });

    canvasesPath = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "rate-limit-e2e-"),
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
    // The realtime gateway (fired on placement) needs a listening HTTP server.
    await app.listen(0);

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
    await seedAll();
  });

  afterEach(async () => {
    mockDiscordServer.resetHandlers();
    resetMockDiscord();
    // The throttler store is in-process and shared across tests in this file;
    // clear it so an exhausted budget never leaks into the next case.
    throttlerStorage.onApplicationShutdown();
    throttlerStorage.storage.clear();
    await cacheService.clearCachedCanvas(1);
  });

  describe("budget exhaustion", () => {
    it("throttles pixel placement once the per-user budget is spent", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      // Cooldown rejections still consume the throttle budget, so the admitted
      // requests are allowed regardless of their domain outcome.
      await drainBudget(RATE_LIMITS.pixelPlacement.limit, () =>
        placePixel(agent),
      );

      const blocked = await placePixel(agent).expect(429);
      expect(blocked.body).toStrictEqual(RATE_LIMITED);
    });

    it("throttles the guild refresh once the budget is spent, before reaching Discord", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await drainBudget(RATE_LIMITS.guildRefresh.limit, () =>
        agent.post("/api/v1/discord/guilds/refresh").expect(200),
      );

      const callsBeforeBlock = mockDiscord.callCounts.guilds;

      const blocked = await agent
        .post("/api/v1/discord/guilds/refresh")
        .expect(429);
      expect(blocked.body).toStrictEqual(RATE_LIMITED);

      // The throttler short-circuits before the controller, so Discord is not hit.
      expect(mockDiscord.callCounts.guilds).toBe(callsBeforeBlock);
    });
  });

  describe("shared frame-mutation bucket", () => {
    it("counts create, edit and delete against one budget", async () => {
      await seedOwnedFrame();

      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const createBody = (name: string) => ({
        name,
        canvasId: 1,
        x0: 0,
        y0: 0,
        x1: 1,
        y1: 1,
        owner: { type: "user", id: MOCK_DISCORD_USER_ID },
      });
      const editBody = { name: "Renamed", x0: 0, y0: 0, x1: 1, y1: 1 };

      // Fill the whole budget by alternating two different mutation routes, so
      // the bucket is provably shared rather than per-route.
      const createdIds: string[] = [];
      for (let i = 0; i < RATE_LIMITS.frameMutation.limit; i++) {
        if (i % 2 === 0) {
          const response = await agent
            .post("/api/v1/frame")
            .send(createBody(`Frame ${i}`))
            .expect(201);
          createdIds.push(response.body.id);
        } else {
          await agent
            .put(`/api/v1/frame/${OWNED_FRAME_ID}/edit`)
            .send(editBody)
            .expect(200);
        }
      }

      // The next mutation — on a third route — draws from the same exhausted
      // budget, so it is throttled and never runs.
      const blocked = await agent
        .delete(`/api/v1/frame/${createdIds[0]}/delete`)
        .expect(429);
      expect(blocked.body).toStrictEqual(RATE_LIMITED);
      await expect(
        prisma.frame.findUnique({ where: { id: createdIds[0] } }),
      ).resolves.not.toBeNull();
    });
  });

  describe("bucket isolation", () => {
    it("does not let an exhausted pixel budget throttle frame mutations", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await drainBudget(RATE_LIMITS.pixelPlacement.limit, () =>
        placePixel(agent),
      );
      await placePixel(agent).expect(429);

      // A different bucket is untouched, so the create still succeeds.
      await agent
        .post("/api/v1/frame")
        .send({
          name: "Independent",
          canvasId: 1,
          x0: 0,
          y0: 0,
          x1: 1,
          y1: 1,
          owner: { type: "user", id: MOCK_DISCORD_USER_ID },
        })
        .expect(201);
    });
  });

  describe("tracker", () => {
    it("keys the budget by Discord user, shared across that user's sessions", async () => {
      const first = request.agent(app.getHttpServer());
      const second = request.agent(app.getHttpServer());
      await signIn(first);
      await signIn(second);

      // The first session spends the whole per-user budget.
      await drainBudget(RATE_LIMITS.pixelPlacement.limit, () =>
        placePixel(first),
      );

      // The second session is the same Discord user, so it is already throttled
      // despite holding a different cookie.
      const blocked = await placePixel(second).expect(429);
      expect(blocked.body).toStrictEqual(RATE_LIMITED);
    });

    it("falls back to a per-IP budget for unauthenticated callers", async () => {
      const server = app.getHttpServer();
      const ipA = "203.0.113.10";
      const ipB = "198.51.100.20";

      const anonymousPlace = (ip: string) =>
        request(server)
          .post("/api/v1/canvas/1/pixel")
          .set("X-Forwarded-For", ip)
          .send({ x: 0, y: 0, colorId: 2 });

      // Anonymous requests are throttled before the login guard rejects them, so
      // the admitted ones from one IP still surface as 401...
      await drainBudget(RATE_LIMITS.pixelPlacement.limit, () =>
        anonymousPlace(ipA).expect(401),
      );

      // ...the next from that IP is throttled (429 wins over the 401)...
      const blocked = await anonymousPlace(ipA).expect(429);
      expect(blocked.body).toStrictEqual(RATE_LIMITED);

      // ...while a different IP still has its own untouched budget.
      await anonymousPlace(ipB).expect(401);
    });
  });

  describe("non-throttled routes", () => {
    it("never throttles routes without a rate-limit decorator", async () => {
      const server = app.getHttpServer();

      // Far more than any configured budget; the canvas PNG route opts out, so
      // the global guard skips it entirely.
      for (let attempt = 0; attempt < 8; attempt++) {
        await request(server).get("/api/v1/canvas/1").expect(200);
      }
    });
  });
});
