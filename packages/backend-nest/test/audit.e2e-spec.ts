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

/** Three audit entries, oldest to newest (created_at ascending). */
async function seedAuditLog(): Promise<void> {
  await prisma.auditLog.create({
    data: {
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      actorId: 1n,
      actorRole: "admin",
      action: "notice.create",
      resourceType: "notice",
      resourceId: "10",
      metadata: { header: "Hello" },
    },
  });
  await prisma.auditLog.create({
    data: {
      createdAt: new Date("2024-01-02T00:00:00.000Z"),
      actorId: 1n,
      actorRole: "moderator",
      action: "blocklist.add",
      resourceType: "blocklist",
      resourceId: null,
      metadata: { userIds: ["1"] },
    },
  });
  await prisma.auditLog.create({
    data: {
      createdAt: new Date("2024-01-03T00:00:00.000Z"),
      actorId: 9n,
      actorRole: "admin",
      action: "event.update",
      resourceType: "event",
      resourceId: "5",
    },
  });
}

describe("Audit log routes (e2e)", () => {
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

  describe("GET /api/v1/audit-log", () => {
    it("requires authentication", async () => {
      await request(app.getHttpServer()).get("/api/v1/audit-log").expect(401);
    });

    it("forbids non-admin moderators", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await agent.get("/api/v1/audit-log").expect(403);
    });

    it("returns entries newest first with the actor profile joined", async () => {
      await seedAuditLog();

      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent.get("/api/v1/audit-log").expect(200);

      expect(response.body.nextCursor).toBeNull();
      expect(
        response.body.entries.map((entry: { action: string }) => entry.action),
      ).toEqual(["event.update", "blocklist.add", "notice.create"]);

      expect(response.body.entries[0]).toMatchObject({
        actorId: "9",
        actorRole: "admin",
        actorUsername: "test_user_9",
        resourceType: "event",
        resourceId: "5",
      });
      expect(response.body.entries[2]).toMatchObject({
        action: "notice.create",
        metadata: { header: "Hello" },
      });
    });

    it("filters by action prefix", async () => {
      await seedAuditLog();

      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .get("/api/v1/audit-log")
        .query({ action: "notice." })
        .expect(200);

      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].action).toBe("notice.create");
    });

    it("filters by actor", async () => {
      await seedAuditLog();

      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .get("/api/v1/audit-log")
        .query({ actorId: "9" })
        .expect(200);

      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].actorId).toBe("9");
    });

    it("filters by resource type", async () => {
      await seedAuditLog();

      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .get("/api/v1/audit-log")
        .query({ resourceType: "event" })
        .expect(200);

      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].resourceType).toBe("event");
    });

    it("paginates with a keyset cursor", async () => {
      await seedAuditLog();

      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const firstPage = await agent
        .get("/api/v1/audit-log")
        .query({ limit: 1 })
        .expect(200);

      expect(firstPage.body.entries).toHaveLength(1);
      expect(firstPage.body.entries[0].action).toBe("event.update");
      expect(firstPage.body.nextCursor).toEqual(expect.any(String));

      const secondPage = await agent
        .get("/api/v1/audit-log")
        .query({ limit: 1, cursor: firstPage.body.nextCursor })
        .expect(200);

      expect(secondPage.body.entries).toHaveLength(1);
      expect(secondPage.body.entries[0].action).toBe("blocklist.add");
    });

    it("rejects an unknown action filter", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      await agent
        .get("/api/v1/audit-log")
        .query({ action: "not-a-real-action" })
        .expect(400);
    });

    it("rejects a non-positive limit", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      await agent.get("/api/v1/audit-log").query({ limit: 0 }).expect(400);
    });
  });
});
