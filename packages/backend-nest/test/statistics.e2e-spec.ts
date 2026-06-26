import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { appConfig } from "@/config/app.config";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";

const FRAME_ID = "abc123";

async function createFrameForCanvas(canvasId: number) {
  await prisma.frame.create({
    data: {
      id: FRAME_ID,
      canvasId,
      ownerUserId: 1n,
      name: "Stats Frame",
      x0: 0,
      y0: 0,
      x1: 1,
      y1: 1,
    },
  });
}

describe("Statistics routes (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
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
  });

  beforeEach(async () => {
    await seedAll();
  });

  describe("GET /api/v1/statistics/user/:userId/:canvasId", () => {
    it("returns the user's stats on a canvas", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/user/1/1")
        .expect(200);

      expect(response.body).toMatchObject({
        userId: "1",
        canvasId: 1,
        totalPixels: 6,
        rank: 1,
      });
      expect(response.body.mostFrequentColor?.id).toBe(1);
      expect(response.body.mostRecentTimestamp).toBeDefined();
    });

    it("returns an empty body when the user has no stats", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/user/1234/1")
        .expect(200);

      // The service returns null, which Nest serialises as an empty body.
      expect(response.body).toStrictEqual({});
      expect(response.text).toBe("");
    });

    it("rejects a non-numeric user ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/statistics/user/oops/1")
        .expect(400);
    });

    it("rejects a non-numeric canvas ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/statistics/user/1/oops")
        .expect(400);
    });
  });

  describe("GET /api/v1/statistics/leaderboard/canvas/:canvasId", () => {
    it("returns a paginated leaderboard", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/leaderboard/canvas/1")
        .expect(200);

      expect(response.body).toMatchObject({
        total: 1,
        page: 1,
      });
      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0]).toMatchObject({
        rank: 1,
        userId: "1",
        totalPixels: 6,
        username: "test_user_1",
        profilePictureUrl: "https://example.com/avatar1.png",
      });
    });

    it("clamps the page size to 40", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/leaderboard/canvas/1?size=1000")
        .expect(200);

      expect(response.body.size).toBe(40);
    });

    it("rejects a non-positive page size", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/statistics/leaderboard/canvas/1?size=0")
        .expect(400);
    });
  });

  describe("GET /api/v1/statistics/leaderboard/canvas/:canvasId/color/:colorId", () => {
    it("returns a paginated leaderboard for a color", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/leaderboard/canvas/1/color/1")
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0]).toMatchObject({
        rank: 1,
        userId: "1",
        totalPixels: 4,
      });
    });

    it("rejects a non-numeric color ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/statistics/leaderboard/canvas/1/color/oops")
        .expect(400);
    });
  });

  describe("GET /api/v1/statistics/leaderboard/frame/:frameId", () => {
    it("returns a paginated leaderboard for a frame", async () => {
      await createFrameForCanvas(1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/statistics/leaderboard/frame/${FRAME_ID}`)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0]).toMatchObject({
        rank: 1,
        userId: "1",
        totalPixels: 6,
      });
    });

    it("rejects a malformed frame ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/statistics/leaderboard/frame/not-a-frame")
        .expect(400);
    });
  });

  describe("GET /api/v1/statistics/leaderboard/frame/:frameId/color/:colorId", () => {
    it("returns a paginated leaderboard for a frame color", async () => {
      await createFrameForCanvas(1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/statistics/leaderboard/frame/${FRAME_ID}/color/1`)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0]).toMatchObject({
        rank: 1,
        userId: "1",
        totalPixels: 4,
      });
    });
  });

  describe("GET /api/v1/statistics/summary/canvas/:canvasId", () => {
    it("returns aggregate canvas statistics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/summary/canvas/1")
        .expect(200);

      expect(response.body).toMatchObject({
        canvasId: 1,
        totalUsersInvolved: 1,
        totalPixelsPlaced: 6,
      });
      expect(response.body.lastPlacedAt).not.toBeNull();
      expect(response.body.colorDistribution[0]).toEqual({
        colorId: 1,
        count: 4,
      });
    });

    it("returns 404 for a canvas with no statistics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/summary/canvas/404")
        .expect(404);

      expect(response.body).toStrictEqual({
        message: "Canvas statistics not found for canvas 404",
      });
    });
  });

  describe("GET /api/v1/statistics/summary/event/:eventId", () => {
    it("returns aggregate event statistics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/summary/event/1")
        .expect(200);

      expect(response.body).toMatchObject({
        eventId: 1,
        totalUsersInvolved: 1,
        totalPixelsPlaced: 6,
      });
    });

    it("returns 404 for an event with no statistics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/summary/event/404")
        .expect(404);

      expect(response.body).toStrictEqual({
        message: "Event statistics not found for event 404",
      });
    });
  });

  describe("GET /api/v1/statistics/summary/frame/:frameId", () => {
    it("returns aggregate frame statistics", async () => {
      await createFrameForCanvas(1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/statistics/summary/frame/${FRAME_ID}`)
        .expect(200);

      expect(response.body).toMatchObject({
        frameId: FRAME_ID,
        totalUsersInvolved: 1,
        totalPixelsPlaced: 6,
      });
      expect(response.body.lastPlacedAt).not.toBeNull();
      expect(response.body.colorDistribution[0]).toEqual({
        colorId: 1,
        count: 4,
      });
    });

    it("returns 404 for a frame with no statistics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/statistics/summary/frame/ffffff")
        .expect(404);

      expect(response.body).toStrictEqual({
        message: "Frame statistics not found for frame ffffff",
      });
    });
  });
});
