import express from "express";
import request from "supertest";
import {
  deletePixelHistoryEntries,
  getPixelHistorySummary,
} from "@/services/historyService";
import { mockAuth } from "@/test/mockAuth";
import { historyRouter } from "./history";

vi.mock("@/services/historyService", () => ({
  deletePixelHistoryEntries: vi.fn(),
  getPixelHistorySummary: vi.fn(),
}));

const createApp = ({ authenticated = false, moderator = false } = {}) => {
  const app = express();
  app.use(express.json());
  app.use(mockAuth);
  app.use((req, _res, next) => {
    req.session = {} as typeof req.session;
    if (authenticated) {
      req.session.discordAccessToken = "test-access-token";
    }
    if (moderator && req.user) {
      req.user = {
        ...req.user,
        isCanvasModerator: true,
      };
    }
    next();
  });
  app.use("/api/v1/canvas/:canvasId/pixel/history", historyRouter);
  return app;
};

describe("History route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pixel history for a single coordinate", async () => {
    const responseBody = {
      pixelHistory: [
        {
          id: "1",
          color: { id: 1, name: "Red", code: "FF00" },
          timestamp: new Date(0).toISOString(),
          guildId: null,
          userId: "1",
          userProfile: null,
        },
      ],
      totalEntries: 1,
      historyIds: ["1"],
      users: {
        "1": {
          count: 1,
          colors: {
            "1": 1,
          },
          firstPlaced: new Date(0).toISOString(),
          lastPlaced: new Date(0).toISOString(),
        },
      },
    };
    vi.mocked(getPixelHistorySummary).mockResolvedValueOnce(
      responseBody as unknown as Awaited<
        ReturnType<typeof getPixelHistorySummary>
      >,
    );

    const app = createApp();
    const response = await request(app)
      .get("/api/v1/canvas/1/pixel/history?x=2&y=3")
      .expect(200);

    expect(response.body).toStrictEqual(responseBody);
    expect(getPixelHistorySummary).toHaveBeenCalledTimes(1);
    expect(getPixelHistorySummary).toHaveBeenCalledWith(
      {
        canvasId: 1,
        points: {
          x: 2,
          y: 3,
        },
      },
      false,
    );
  });

  it("returns pixel history for a range and user filter", async () => {
    const responseBody = {
      pixelHistory: [],
      totalEntries: 0,
      historyIds: [],
      users: {},
    };
    vi.mocked(getPixelHistorySummary).mockResolvedValueOnce(
      responseBody as Awaited<ReturnType<typeof getPixelHistorySummary>>,
    );

    const app = createApp({ authenticated: true, moderator: true });
    const response = await request(app)
      .post("/api/v1/canvas/9/pixel/history?x0=1&y0=2&x1=3&y1=4")
      .set("X-TestUserId", "1")
      .send({
        fromDateTime: "1970-01-01T00:00:00.000Z",
        toDateTime: "1970-01-02T00:00:00.000Z",
        includeUserIds: ["1", "2"],
        includeColors: [1, 2],
      })
      .type("json")
      .expect(200);

    expect(response.body).toStrictEqual(responseBody);
    expect(getPixelHistorySummary).toHaveBeenCalledTimes(1);
    expect(getPixelHistorySummary).toHaveBeenCalledWith(
      {
        canvasId: 9,
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
        dateRange: {
          from: new Date("1970-01-01T00:00:00.000Z"),
          to: new Date("1970-01-02T00:00:00.000Z"),
        },
        userIdFilter: {
          ids: [1n, 2n],
          include: true,
        },
        colorFilter: {
          colors: [1, 2],
          include: true,
        },
      },
      true,
    );
  });

  it("returns pixel history for a range and excluded color filter", async () => {
    const responseBody = {
      pixelHistory: [],
      totalEntries: 0,
      historyIds: [],
      users: {},
    };
    vi.mocked(getPixelHistorySummary).mockResolvedValueOnce(
      responseBody as Awaited<ReturnType<typeof getPixelHistorySummary>>,
    );

    const app = createApp({ authenticated: true, moderator: true });
    const response = await request(app)
      .post("/api/v1/canvas/9/pixel/history?x0=1&y0=2&x1=3&y1=4")
      .set("X-TestUserId", "1")
      .send({
        excludeColors: [3, 4],
      })
      .type("json")
      .expect(200);

    expect(response.body).toStrictEqual(responseBody);
    expect(getPixelHistorySummary).toHaveBeenCalledTimes(1);
    expect(getPixelHistorySummary).toHaveBeenCalledWith(
      {
        canvasId: 9,
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
        dateRange: {
          from: undefined,
          to: undefined,
        },
        userIdFilter: undefined,
        colorFilter: {
          colors: [3, 4],
          include: false,
        },
      },
      true,
    );
  });

  it("returns 400 when both includeColors and excludeColors are provided", async () => {
    const app = createApp({ authenticated: true, moderator: true });

    const response = await request(app)
      .post("/api/v1/canvas/9/pixel/history?x0=1&y0=2&x1=3&y1=4")
      .set("X-TestUserId", "1")
      .send({
        includeColors: [1],
        excludeColors: [2],
      })
      .type("json");

    expect(response.status).toBe(406);
    expect(response.body).toMatchObject({
      message: "Invalid request body. Expected a valid history query object",
    });
    expect(getPixelHistorySummary).not.toHaveBeenCalled();
  });

  it("deletes history entries for a moderator", async () => {
    const app = createApp({ authenticated: true, moderator: true });
    vi.mocked(deletePixelHistoryEntries).mockResolvedValueOnce(undefined);

    const response = await request(app)
      .delete("/api/v1/canvas/1/pixel/history")
      .set("X-TestUserId", "1")
      .send({
        x0: 0,
        y0: 0,
        includeUserIds: ["1", "2"],
        shouldBlockAuthors: true,
      })
      .type("json")
      .expect(204);

    expect(response.body).toStrictEqual({});
    expect(deletePixelHistoryEntries).toHaveBeenCalledTimes(1);
    expect(deletePixelHistoryEntries).toHaveBeenCalledWith(
      {
        canvasId: 1,
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        dateRange: {
          from: undefined,
          to: undefined,
        },
        userIdFilter: {
          ids: [1n, 2n],
          include: true,
        },
        colorFilter: undefined,
      },
      true,
    );
  });

  it("returns 403 when deleting history without moderator permissions", async () => {
    const app = createApp({ authenticated: true, moderator: false });
    vi.mocked(deletePixelHistoryEntries).mockResolvedValueOnce(undefined);

    const response = await request(app)
      .delete("/api/v1/canvas/1/pixel/history")
      .set("X-TestUserId", "1")
      .send({
        historyIds: [1],
      })
      .type("json");

    expect(response.status).toBe(403);
    expect(response.body).toStrictEqual({
      message: "You do not have permission to perform this action",
    });
    expect(deletePixelHistoryEntries).not.toHaveBeenCalled();
  });
});
