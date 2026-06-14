import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import { appConfig } from "@/config/app.config";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";
import {
  mockDiscordServer,
  onUnhandledRequest,
  resetMockDiscord,
  VALID_OAUTH_CODE,
} from "./mock-discord";

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

describe("Blocklist routes (e2e)", () => {
  let app: NestExpressApplication;
  let cacheService: CanvasCacheService;

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
    await app.init();

    cacheService = app.get(CanvasCacheService);
  });

  afterAll(async () => {
    await app.close();
    mockDiscordServer.close();
  });

  beforeEach(async () => {
    await seedAll();
  });

  afterEach(async () => {
    mockDiscordServer.resetHandlers();
    resetMockDiscord();
    await cacheService.clearCachedCanvas(1);
  });

  it("requires a moderator to list the blocklist", async () => {
    await request(app.getHttpServer()).get("/api/v1/blocklist").expect(401);
  });

  it("lists the blocklist for a moderator", async () => {
    const agent = request.agent(app.getHttpServer());
    await signIn(agent);

    const response = await agent.get("/api/v1/blocklist").expect(200);

    // seedAll blocklists user 9.
    expect(response.body).toEqual([expect.objectContaining({ userId: "9" })]);
  });

  it("adds and removes users from the blocklist", async () => {
    const agent = request.agent(app.getHttpServer());
    await signIn(agent);

    await agent.put("/api/v1/blocklist").send({ userId: "1" }).expect(201);
    await expect(
      prisma.blacklist.findFirst({ where: { userId: 1n } }),
    ).resolves.not.toBeNull();

    await agent.delete("/api/v1/blocklist").send({ userId: "1" }).expect(204);
    await expect(
      prisma.blacklist.findFirst({ where: { userId: 1n } }),
    ).resolves.toBeNull();
  });

  it("revives erased history and rebuilds pixels when unblocking with restore", async () => {
    const agent = request.agent(app.getHttpServer());
    await signIn(agent);

    // User 9 has an erased placement at canvas 1 (1,1); the live pixel there is
    // the blank colour 1.
    await prisma.history.create({
      data: {
        canvasId: 1,
        userId: 9n,
        x: 1,
        y: 1,
        colorId: 2,
        timestamp: new Date("2024-01-01T00:00:00.000Z"),
        erasedAt: new Date("2024-01-02T00:00:00.000Z"),
      },
    });

    await agent
      .delete("/api/v1/blocklist")
      .send({ userId: "9", shouldRestoreHistoryForCanvasId: [1] })
      .expect(204);

    // The user is unblocked.
    await expect(
      prisma.blacklist.findFirst({ where: { userId: 9n } }),
    ).resolves.toBeNull();

    // The erased row is revived…
    const revived = await prisma.history.findFirst({
      where: { canvasId: 1, userId: 9n, x: 1, y: 1 },
    });
    expect(revived?.erasedAt).toBeNull();

    // …and the pixel rebuilt from it.
    const pixel = await prisma.pixel.findFirst({
      where: { canvasId: 1, x: 1, y: 1 },
    });
    expect(pixel?.colorId).toBe(2);
  });
});
