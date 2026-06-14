import type { AddressInfo } from "node:net";
import { SocketEvents } from "@blurple-canvas-web/types";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { io, type Socket } from "socket.io-client";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import { appConfig } from "@/config/app.config";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";
import {
  ADMIN_ROLE_ID,
  MODERATOR_ROLE_ID,
  mockDiscord,
  mockDiscordServer,
  onUnhandledRequest,
  resetMockDiscord,
  VALID_OAUTH_CODE,
} from "./mock-discord";

/**
 * Signs the agent in via the OAuth callback, then waits for the
 * fire-and-forget guild-record sync so it cannot race the rollback.
 */
async function signIn(agent: TestAgent): Promise<void> {
  const response = await agent.get(
    `/api/v1/discord/callback?code=${VALID_OAUTH_CODE}`,
  );
  expect(response.status).toBe(302);

  await vi.waitFor(async () => {
    const synced = await prisma.discordGuildRecord.count();
    expect(synced).toBeGreaterThan(0);
  });
}

async function seedInfo(): Promise<void> {
  await prisma.info.create({
    data: {
      title: "History Test",
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

describe("History routes (e2e)", () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let cacheService: CanvasCacheService;
  const clients: Socket[] = [];

  beforeAll(async () => {
    mockDiscordServer.listen({ onUnhandledRequest });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(appConfig.KEY)
      .useValue({
        environment: "test",
        port: 3001,
        frontendUrl: "http://localhost:3000",
        paths: { root: "/tmp", canvases: "/tmp" },
      })
      .compile();

    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;

    cacheService = app.get(CanvasCacheService);
  });

  afterAll(async () => {
    await app.close();
    mockDiscordServer.close();
  });

  beforeEach(async () => {
    await seedAll();
    await seedInfo();
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    mockDiscordServer.resetHandlers();
    resetMockDiscord();
    await cacheService.clearCachedCanvas(1);
  });

  /** Collects every bulk-placement event for the canvas. */
  async function collectBulkEvents(canvasId: number): Promise<unknown[]> {
    const client = io(baseUrl);
    clients.push(client);

    const events: unknown[] = [];
    client.on(SocketEvents.placePixelBulk(canvasId), (payload: unknown) => {
      events.push(payload);
    });

    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", reject);
    });

    return events;
  }

  describe("GET /api/v1/canvas/:canvasId/pixel/history", () => {
    it("returns the public single-cell history", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/canvas/1/pixel/history?x=0&y=0")
        .expect(200);

      expect(response.body.total).toBe(4);
      expect(response.body.entries).toHaveLength(4);
      expect(response.body.users).toBeUndefined();
      expect(typeof response.body.executionDurationMs).toBe("number");
    });
  });

  describe("POST /api/v1/canvas/:canvasId/pixel/history", () => {
    it("requires a moderator", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/canvas/1/pixel/history?x0=0&y0=0&x1=1&y1=1")
        .send({})
        .expect(401);
    });

    it("returns the per-user summary for a region", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const response = await agent
        .post("/api/v1/canvas/1/pixel/history?x0=0&y0=0&x1=1&y1=1")
        .send({ includeUserIds: ["1"] })
        .expect(200);

      expect(response.body.users["1"]).toMatchObject({ count: 6 });
    });
  });

  describe("DELETE /api/v1/canvas/:canvasId/pixel/history", () => {
    it("erases a region, rebuilds the pixels and blocks the author", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const events = await collectBulkEvents(1);

      await agent
        .delete("/api/v1/canvas/1/pixel/history")
        .send({ x0: 0, y0: 0, x1: 1, y1: 1, shouldBlockAuthors: true })
        .expect(204);

      // Every history row in the region is now soft-erased.
      const live = await prisma.history.count({
        where: { canvasId: 1, erasedAt: null },
      });
      expect(live).toBe(0);

      // Pixels rebuilt from the (now empty) live history → blank colour 1.
      const nonBlank = await prisma.pixel.count({
        where: { canvasId: 1, colorId: { not: 1 } },
      });
      expect(nonBlank).toBe(0);

      // The author (user 1) is now blocklisted.
      await expect(
        prisma.blacklist.findFirst({ where: { userId: 1n } }),
      ).resolves.not.toBeNull();

      // Exactly one bulk broadcast for the erased coordinates.
      await vi.waitFor(() => expect(events).toHaveLength(1));
    });

    it("rejects erasing a canvas that is not in the current event", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      // Canvas 9 belongs to event 9, not the current event 1.
      await agent
        .delete("/api/v1/canvas/9/pixel/history")
        .send({ x0: 0, y0: 0 })
        .expect(403);

      // Nothing was erased.
      const erased = await prisma.history.count({
        where: { canvasId: 9, erasedAt: { not: null } },
      });
      expect(erased).toBe(0);
    });
  });

  describe("DELETE /api/v1/canvas/:canvasId/pixel/history/force", () => {
    it("forbids non-admin moderators", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent); // default role is moderator, not admin

      await agent
        .delete("/api/v1/canvas/9/pixel/history/force")
        .send({ x0: 0, y0: 0 })
        .expect(403);
    });

    it("lets an admin erase a non-current-event canvas", async () => {
      const agent = request.agent(app.getHttpServer());
      mockDiscord.memberRoles = [ADMIN_ROLE_ID, MODERATOR_ROLE_ID];
      await signIn(agent);

      await agent
        .delete("/api/v1/canvas/9/pixel/history/force")
        .send({ x0: 0, y0: 1 })
        .expect(204);

      const erased = await prisma.history.count({
        where: { canvasId: 9, erasedAt: { not: null } },
      });
      expect(erased).toBeGreaterThan(0);
    });
  });
});
