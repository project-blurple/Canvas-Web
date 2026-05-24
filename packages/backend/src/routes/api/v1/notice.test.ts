import express from "express";
import request from "supertest";
import { errorHandler } from "@/middleware/errorHandler";
import { audit } from "@/services/auditLogService";
import { isCanvasAdmin } from "@/services/discordGuildService";
import {
  createNotice,
  deleteNotice,
  updateNotice,
} from "@/services/noticeService";
import { mockAuth } from "@/test/mockAuth";
import { noticeRouter } from "./notice";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastNoticeUpdate: vi.fn(),
  },
}));

vi.mock("@/services/auditLogService", () => ({
  audit: vi.fn(async () => {}),
}));

vi.mock("@/services/noticeService", () => ({
  createNotice: vi.fn(),
  deleteNotice: vi.fn(),
  getNotices: vi.fn(),
  updateNotice: vi.fn(),
}));

vi.mock("@/services/discordGuildService", () => ({
  isCanvasAdmin: vi.fn(),
  isCanvasModerator: vi.fn(),
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(mockAuth);
  app.use((req, _res, next) => {
    req.user = { id: "1", username: "test", profilePictureUrl: "test" };
    req.session = {
      discordAccessToken: "test-access-token",
      discordTokenExpiresAt: Number.POSITIVE_INFINITY,
    } as typeof req.session;
    next();
  });
  app.use("/api/v1/notice", noticeRouter);
  app.use(errorHandler);
  return app;
};

describe("Notice route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCanvasAdmin).mockResolvedValue(true);
  });

  it("broadcasts notice updates after create, update, and delete", async () => {
    const app = createApp();

    vi.mocked(createNotice).mockResolvedValueOnce({
      id: 1,
      type: "info",
      header: "New notice",
      content: "Created notice",
      priority: 0,
      startAt: null,
      endAt: null,
      persisted: false,
      canvasId: null,
      createdAt: new Date(0).toISOString(),
    });

    const createResponse = await request(app)
      .post("/api/v1/notice")
      .set("Test-User-Id", "1")
      .send({
        type: "info",
        header: "New notice",
        content: "Created notice",
        priority: 0,
        persisted: false,
        canvasId: null,
      });

    expect(createResponse.status).toBe(201);
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.anything(),
      "admin",
      "notice.create",
      expect.objectContaining({ resourceId: 1 }),
    );

    vi.mocked(updateNotice).mockResolvedValueOnce({
      id: 1,
      type: "warning",
      header: "Updated notice",
      content: "Updated content",
      priority: 1,
      startAt: null,
      endAt: null,
      persisted: true,
      canvasId: null,
      createdAt: new Date(0).toISOString(),
    });

    const updateResponse = await request(app)
      .put("/api/v1/notice/1")
      .set("Test-User-Id", "1")
      .send({
        type: "warning",
        header: "Updated notice",
        content: "Updated content",
        priority: 1,
        persisted: true,
        canvasId: null,
      });

    expect(updateResponse.status).toBe(200);
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.anything(),
      "admin",
      "notice.update",
      expect.objectContaining({ resourceId: 1 }),
    );

    const deleteResponse = await request(app)
      .delete("/api/v1/notice/1")
      .set("Test-User-Id", "1");

    expect(deleteResponse.status).toBe(204);
    expect(vi.mocked(deleteNotice)).toHaveBeenCalledWith(1);
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.anything(),
      "admin",
      "notice.delete",
      expect.objectContaining({ resourceId: 1 }),
    );
  });
});
