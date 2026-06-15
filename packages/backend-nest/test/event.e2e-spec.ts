import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { appConfig } from "@/config/app.config";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";
import {
  ADMIN_ROLE_ID,
  mockDiscord,
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

/** Signs in with the admin role so the canvas-admin guard passes. */
async function signInAsAdmin(agent: TestAgent): Promise<void> {
  mockDiscord.memberRoles = [ADMIN_ROLE_ID];
  await signIn(agent);
}

async function seedInfo(): Promise<void> {
  await prisma.info.create({
    data: {
      title: "Event Test",
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

describe("Event routes (e2e)", () => {
  let app: NestExpressApplication;

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
  });

  afterAll(async () => {
    await app.close();
    mockDiscordServer.close();
  });

  beforeEach(async () => {
    await seedAll();
    await seedInfo();
  });

  afterEach(() => {
    mockDiscordServer.resetHandlers();
    resetMockDiscord();
  });

  describe("GET /api/v1/event/current", () => {
    it("returns the current event", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/event/current")
        .expect(200);

      expect(response.body).toStrictEqual({
        id: 1,
        name: "Current Event",
        isCurrentEvent: true,
      });
    });
  });

  describe("GET /api/v1/event/:eventId", () => {
    it("returns an event that is not the current one", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/event/9")
        .expect(200);

      expect(response.body).toStrictEqual({
        id: 9,
        name: "Past Event",
        isCurrentEvent: false,
      });
    });

    it("returns 404 for an unknown event", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/event/404")
        .expect(404);

      expect(response.body).toStrictEqual({
        message: "There is no event with ID 404",
      });
    });

    it("rejects a non-numeric event ID", async () => {
      await request(app.getHttpServer()).get("/api/v1/event/oops").expect(400);
    });
  });

  describe("POST /api/v1/event", () => {
    it("requires authentication", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/event")
        .send({ name: "New Event", id: 5 })
        .expect(401);
    });

    it("forbids non-admin moderators", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent); // default role is moderator, not admin

      await agent
        .post("/api/v1/event")
        .send({ name: "New Event", id: 5 })
        .expect(403);
    });

    it("creates an event and records an audit entry as admin", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .post("/api/v1/event")
        .send({ name: "New Event", id: 5 })
        .expect(201);

      expect(response.body).toStrictEqual({
        id: 5,
        name: "New Event",
        isCurrentEvent: false,
      });

      await expect(
        prisma.event.findUnique({ where: { id: 5 } }),
      ).resolves.toMatchObject({ name: "New Event" });

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "event.create" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "event",
          resourceId: "5",
          metadata: { name: "New Event", id: 5 },
        });
      });
    });

    it("returns a conflict for a duplicate event ID", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .post("/api/v1/event")
        .send({ name: "Duplicate", id: 1 })
        .expect(409);

      expect(response.body).toStrictEqual({
        message: "An event with ID 1 already exists",
      });
    });

    it("rejects an invalid body", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      await agent.post("/api/v1/event").send({ name: "", id: 5 }).expect(400);
    });
  });

  describe("PUT /api/v1/event/:eventId", () => {
    it("requires authentication", async () => {
      await request(app.getHttpServer())
        .put("/api/v1/event/1")
        .send({ name: "Renamed" })
        .expect(401);
    });

    it("renames an event and records an audit entry as admin", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .put("/api/v1/event/9")
        .send({ name: "Renamed Event" })
        .expect(200);

      expect(response.body).toStrictEqual({
        id: 9,
        name: "Renamed Event",
        isCurrentEvent: false,
      });

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "event.update" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "event",
          resourceId: "9",
          metadata: { name: "Renamed Event" },
        });
      });
    });

    it("returns 404 when renaming an event that does not exist", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .put("/api/v1/event/404")
        .send({ name: "Renamed Event" })
        .expect(404);

      expect(response.body).toStrictEqual({ message: "Resource not found" });
    });
  });
});
