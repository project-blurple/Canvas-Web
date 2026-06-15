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

const HOUR_MS = 60 * 60 * 1000;

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

/**
 * Creates an active and an inactive notice; returns the active one's id. The
 * inactive notice is given the higher priority (lower number) so that the
 * "active first" ordering is actually exercised: by priority alone the inactive
 * notice would sort first, and only the active-first pass moves the active one
 * ahead of it.
 */
async function seedNotices(): Promise<{
  activeId: number;
  inactiveId: number;
}> {
  const active = await prisma.notice.create({
    data: {
      type: "info",
      header: "Active notice",
      content: "Visible now",
      priority: 5,
      startAt: new Date(Date.now() - HOUR_MS),
      endAt: new Date(Date.now() + HOUR_MS),
    },
  });

  const inactive = await prisma.notice.create({
    data: {
      type: "warning",
      header: "Unscheduled notice",
      content: "Never shown",
      priority: 0,
      startAt: null,
    },
  });

  return { activeId: active.id, inactiveId: inactive.id };
}

describe("Notice routes (e2e)", () => {
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
  });

  afterEach(() => {
    mockDiscordServer.resetHandlers();
    resetMockDiscord();
  });

  describe("GET /api/v1/notice", () => {
    it("returns only the active notices", async () => {
      const { activeId } = await seedNotices();

      const response = await request(app.getHttpServer())
        .get("/api/v1/notice")
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: activeId,
        header: "Active notice",
        type: "info",
      });
    });
  });

  describe("GET /api/v1/notice/all", () => {
    it("requires authentication", async () => {
      await request(app.getHttpServer()).get("/api/v1/notice/all").expect(401);
    });

    it("forbids non-admin moderators", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await agent.get("/api/v1/notice/all").expect(403);
    });

    it("returns all notices, active first, for an admin", async () => {
      const { activeId, inactiveId } = await seedNotices();

      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent.get("/api/v1/notice/all").expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe(activeId);
      expect(response.body.map((notice: { id: number }) => notice.id)).toEqual(
        expect.arrayContaining([activeId, inactiveId]),
      );
    });
  });

  describe("POST /api/v1/notice", () => {
    it("requires authentication", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/notice")
        .send({ type: "info", header: "Hi" })
        .expect(401);
    });

    it("creates a notice and records an audit entry as admin", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .post("/api/v1/notice")
        .send({ type: "warning", header: "Heads up", content: "Body" })
        .expect(201);

      expect(response.body).toMatchObject({
        type: "warning",
        header: "Heads up",
        content: "Body",
      });

      await expect(
        prisma.notice.findUnique({ where: { id: response.body.id } }),
      ).resolves.toMatchObject({ header: "Heads up" });

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "notice.create" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "notice",
          resourceId: response.body.id.toString(),
        });
      });
    });

    it("rejects an endAt without a startAt", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      await agent
        .post("/api/v1/notice")
        .send({ type: "info", endAt: new Date().toISOString() })
        .expect(400);
    });
  });

  describe("PUT /api/v1/notice/:noticeId", () => {
    it("updates a notice and records an audit entry as admin", async () => {
      const { activeId } = await seedNotices();

      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .put(`/api/v1/notice/${activeId}`)
        .send({ type: "error", header: "Updated header" })
        .expect(200);

      expect(response.body).toMatchObject({
        id: activeId,
        type: "error",
        header: "Updated header",
      });

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "notice.update" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "notice",
          resourceId: activeId.toString(),
        });
      });
    });
  });

  describe("DELETE /api/v1/notice/:noticeId", () => {
    it("requires authentication", async () => {
      await request(app.getHttpServer()).delete("/api/v1/notice/1").expect(401);
    });

    it("deletes a notice and records an audit entry as admin", async () => {
      const { activeId } = await seedNotices();

      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      await agent.delete(`/api/v1/notice/${activeId}`).expect(204);

      await expect(
        prisma.notice.findUnique({ where: { id: activeId } }),
      ).resolves.toBeNull();

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "notice.delete" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "notice",
          resourceId: activeId.toString(),
        });
      });
    });
  });
});
