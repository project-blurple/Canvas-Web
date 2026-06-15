import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
  MOCK_DISCORD_USER_ID,
  mockDiscordServer,
  onUnhandledRequest,
  resetMockDiscord,
  VALID_OAUTH_CODE,
} from "./mock-discord";

// Frames seeded on canvas 1, spanning the whole 2x2 canvas.
const OWNED_FRAME_ID = "aaaaaa"; // owned by the signed-in user
const GUILD_FRAME_ID = "bbbbbb"; // owned by guild 1
const OTHER_FRAME_ID = "cccccc"; // owned by OTHER_USER_ID

// A seeded user (polarwolf314) who is not the signed-in user.
const OTHER_USER_ID = "201892070091128832";

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

async function seedFrames(): Promise<void> {
  await prisma.frame.createMany({
    data: [
      {
        id: OWNED_FRAME_ID,
        canvasId: 1,
        ownerUserId: BigInt(MOCK_DISCORD_USER_ID),
        name: "My Frame",
        x0: 0,
        y0: 0,
        x1: 2,
        y1: 2,
      },
      {
        id: GUILD_FRAME_ID,
        canvasId: 1,
        ownerGuildId: 1n,
        name: "Guild Frame",
        x0: 0,
        y0: 0,
        x1: 2,
        y1: 2,
      },
      {
        id: OTHER_FRAME_ID,
        canvasId: 1,
        ownerUserId: BigInt(OTHER_USER_ID),
        name: "Someone Else's Frame",
        x0: 0,
        y0: 0,
        x1: 2,
        y1: 2,
      },
    ],
  });
}

describe("Frame routes (e2e)", () => {
  let app: NestExpressApplication;
  let cacheService: CanvasCacheService;
  let canvasesPath: string;

  beforeAll(async () => {
    mockDiscordServer.listen({ onUnhandledRequest });

    canvasesPath = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "frame-e2e-"),
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
    mockDiscordServer.close();
    await fs.promises.rm(canvasesPath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await seedAll();
  });

  afterEach(async () => {
    mockDiscordServer.resetHandlers();
    resetMockDiscord();
    await cacheService.clearCachedCanvas(1);
  });

  describe("GET /api/v1/frame/:frameId", () => {
    it("returns a frame by ID", async () => {
      await seedFrames();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/frame/${OWNED_FRAME_ID}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: OWNED_FRAME_ID,
        canvasId: 1,
        name: "My Frame",
        owner: {
          type: "user",
          user: { id: MOCK_DISCORD_USER_ID },
        },
      });
    });

    it("returns 404 for an unknown frame", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/frame/ffffff")
        .expect(404);

      expect(response.body).toStrictEqual({ message: "Frame not found" });
    });

    it("rejects an invalid frame ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/frame/nothex")
        .expect(400);
    });
  });

  describe("GET /api/v1/frame/user/:userId/:canvasId", () => {
    it("returns a user's frames with the max-frames flag", async () => {
      await seedFrames();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/frame/user/${MOCK_DISCORD_USER_ID}/1`)
        .expect(200);

      expect(response.body.hasReachedMaxFrames).toBe(false);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: OWNED_FRAME_ID,
        owner: { type: "user" },
      });
    });
  });

  describe("GET /api/v1/frame/guilds/:canvasId", () => {
    it("returns frames owned by the given guilds with per-guild flags", async () => {
      await seedFrames();

      const response = await request(app.getHttpServer())
        .get("/api/v1/frame/guilds/1?guildIds=1")
        .expect(200);

      expect(response.body.hasReachedMaxFrames).toStrictEqual({ "1": false });
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: GUILD_FRAME_ID,
        owner: {
          type: "guild",
          guild: { guild_id: "1", name: "Guild 1" },
        },
      });
    });
  });

  describe("GET /api/v1/frame/:frameId@:scale.png", () => {
    it("streams the frame region as a PNG", async () => {
      await seedFrames();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/frame/${OWNED_FRAME_ID}@1.png`)
        .responseType("blob")
        .expect(200);

      expect(response.headers["content-type"]).toBe("image/png");
      expect(response.headers["content-disposition"]).toBe(
        `inline; filename="frame-${OWNED_FRAME_ID}.png"`,
      );
      expect((response.body as Buffer).length).toBeGreaterThan(0);
    });

    it("rejects an invalid scale", async () => {
      await seedFrames();

      await request(app.getHttpServer())
        .get(`/api/v1/frame/${OWNED_FRAME_ID}@3.png`)
        .expect(400);
    });
  });

  describe("POST /api/v1/frame", () => {
    const newFrame = {
      name: "Brand New Frame",
      canvasId: 1,
      x0: 0,
      y0: 0,
      x1: 2,
      y1: 2,
      owner: { type: "user", id: MOCK_DISCORD_USER_ID },
    };

    it("requires login", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/frame")
        .send(newFrame)
        .expect(401);
    });

    it("creates a frame the user owns", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const response = await agent
        .post("/api/v1/frame")
        .send(newFrame)
        .expect(201);

      expect(response.body).toMatchObject({
        name: "Brand New Frame",
        canvasId: 1,
      });
      expect(response.body.id).toMatch(/^[0-9a-f]{6}$/);

      await expect(
        prisma.frame.count({
          where: { ownerUserId: BigInt(MOCK_DISCORD_USER_ID), canvasId: 1 },
        }),
      ).resolves.toBe(1);
    });

    it("forbids creating a frame for another user", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await agent
        .post("/api/v1/frame")
        .send({ ...newFrame, owner: { type: "user", id: OTHER_USER_ID } })
        .expect(403);
    });

    it("rejects an invalid body", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      // x0 === x1 violates the bounds refinement.
      await agent
        .post("/api/v1/frame")
        .send({ ...newFrame, x0: 2, x1: 2 })
        .expect(400);
    });
  });

  describe("PUT /api/v1/frame/:frameId/edit", () => {
    const edit = { name: "Renamed Frame", x0: 0, y0: 0, x1: 2, y1: 2 };

    it("requires login", async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/frame/${OWNED_FRAME_ID}/edit`)
        .send(edit)
        .expect(401);
    });

    it("edits a frame the user owns", async () => {
      await seedFrames();

      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const response = await agent
        .put(`/api/v1/frame/${OWNED_FRAME_ID}/edit`)
        .send(edit)
        .expect(200);

      expect(response.body).toMatchObject({
        id: OWNED_FRAME_ID,
        name: "Renamed Frame",
      });

      await expect(
        prisma.frame.findUnique({ where: { id: OWNED_FRAME_ID } }),
      ).resolves.toMatchObject({ name: "Renamed Frame" });
    });

    it("forbids editing a frame the user does not own", async () => {
      await seedFrames();

      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await agent
        .put(`/api/v1/frame/${OTHER_FRAME_ID}/edit`)
        .send(edit)
        .expect(403);
    });
  });

  describe("DELETE /api/v1/frame/:frameId/delete", () => {
    it("requires login", async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/frame/${OWNED_FRAME_ID}/delete`)
        .expect(401);
    });

    it("deletes a frame the user owns", async () => {
      await seedFrames();

      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      await agent.delete(`/api/v1/frame/${OWNED_FRAME_ID}/delete`).expect(204);

      await expect(
        prisma.frame.findUnique({ where: { id: OWNED_FRAME_ID } }),
      ).resolves.toBeNull();
    });
  });
});
