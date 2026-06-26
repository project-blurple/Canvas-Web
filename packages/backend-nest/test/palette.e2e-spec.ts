import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { appConfig } from "@/config/app.config";
import { testPrisma as prisma, resetSequence } from "@/test/database";
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
      title: "Palette Test",
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

describe("Palette routes (e2e)", () => {
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
    // seedColors inserts explicit IDs without advancing the sequence, so a
    // fresh insert would otherwise collide on the primary key.
    await resetSequence("color");
  });

  afterEach(() => {
    mockDiscordServer.resetHandlers();
    resetMockDiscord();
  });

  describe("GET /api/v1/palette/current", () => {
    it("returns the global colours for the current event", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/palette/current")
        .expect(200);

      // Seeded colours 1 (blank) and 2 (blpl) are global; 3 and 4 are not.
      expect(response.body).toHaveLength(2);
      expect(
        response.body.map((color: { code: string }) => color.code).sort(),
      ).toEqual(["blank", "blpl"]);
      expect(response.body[0]).toMatchObject({
        global: true,
        invite: null,
        guildName: null,
        guildId: null,
      });
    });

    it("returns every colour when allColors is set", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/palette/current?allColors=true")
        .expect(200);

      expect(response.body).toHaveLength(4);
    });
  });

  describe("GET /api/v1/palette/:eventId", () => {
    it("returns the palette for a specific event", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/palette/9")
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it("rejects a non-numeric event ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/palette/oops")
        .expect(400);
    });
  });

  describe("POST /api/v1/palette", () => {
    const newColor = {
      code: "pink",
      name: "Pink",
      global: false,
      rgba: [255, 192, 203, 255],
    };

    it("requires authentication", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/palette")
        .send(newColor)
        .expect(401);
    });

    it("forbids non-admin moderators", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await agent.post("/api/v1/palette").send(newColor).expect(403);
    });

    it("creates a colour and records an audit entry as admin", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .post("/api/v1/palette")
        .send(newColor)
        .expect(201);

      expect(response.body).toStrictEqual({ message: "Color created" });

      const created = await prisma.color.findFirst({
        where: { code: "pink" },
      });
      expect(created).toMatchObject({ name: "Pink", global: false });

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "color.create" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "color",
          resourceId: created?.id.toString(),
        });
      });
    });

    it("rejects a colour with an invalid code length", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      await agent
        .post("/api/v1/palette")
        .send({ ...newColor, code: "toolong" })
        .expect(400);
    });
  });

  describe("PUT /api/v1/palette/:colorId", () => {
    it("edits a colour and records an audit entry as admin", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .put("/api/v1/palette/3")
        .send({
          code: "crms",
          name: "Crimson",
          global: false,
          rgba: [220, 20, 60, 255],
        })
        .expect(200);

      expect(response.body).toStrictEqual({ message: "Color edited" });

      await expect(
        prisma.color.findUnique({ where: { id: 3 } }),
      ).resolves.toMatchObject({ name: "Crimson", code: "crms" });

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "color.update" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "color",
          resourceId: "3",
        });
      });
    });
  });

  describe("DELETE /api/v1/palette/:colorId", () => {
    it("deletes a colour and records an audit entry as admin", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      // Colour 4 (blue) is not referenced by any seeded pixel or history row.
      await agent.delete("/api/v1/palette/4").expect(204);

      await expect(
        prisma.color.findUnique({ where: { id: 4 } }),
      ).resolves.toBeNull();

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "color.delete" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "color",
          resourceId: "4",
        });
      });
    });
  });

  describe("POST /api/v1/palette/:colorId/assign/:eventId/:guildId", () => {
    it("assigns a colour to an event and records an audit entry as admin", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      const response = await agent
        .post("/api/v1/palette/3/assign/9/1")
        .expect(201);

      expect(response.body).toStrictEqual({
        message: "Color assigned to event",
      });

      await expect(
        prisma.participation.findUnique({
          where: { guildId_eventId: { guildId: 1n, eventId: 9 } },
        }),
      ).resolves.toMatchObject({ colorId: 3 });

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "participation.assign" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "participation",
          resourceId: "3:9:1",
        });
      });
    });

    it("returns a conflict when the colour is already assigned", async () => {
      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      await agent.post("/api/v1/palette/3/assign/9/1").expect(201);

      const response = await agent
        .post("/api/v1/palette/3/assign/9/1")
        .expect(409);

      expect(response.body).toStrictEqual({
        message: "Color with ID 3 is already assigned to event with ID 9",
      });
    });
  });

  describe("DELETE /api/v1/palette/:colorId/assign/:eventId/:guildId", () => {
    it("unassigns a colour from an event and records an audit entry as admin", async () => {
      await prisma.participation.create({
        data: { guildId: 1n, eventId: 9, colorId: 3 },
      });

      const agent = request.agent(app.getHttpServer());
      await signInAsAdmin(agent);

      await agent.delete("/api/v1/palette/3/assign/9/1").expect(204);

      await expect(
        prisma.participation.findUnique({
          where: { guildId_eventId: { guildId: 1n, eventId: 9 } },
        }),
      ).resolves.toBeNull();

      await vi.waitFor(async () => {
        const entry = await prisma.auditLog.findFirst({
          where: { action: "participation.unassign" },
          orderBy: { id: "desc" },
        });
        expect(entry).toMatchObject({
          actorRole: "admin",
          resourceType: "participation",
          resourceId: "3:9:1",
        });
      });
    });
  });
});
