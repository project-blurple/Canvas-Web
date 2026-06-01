import { errorHandler } from "@/middleware/errorHandler";
import { getAuditLog } from "@/services/auditLogService";
import { isCanvasAdmin } from "@/services/discordGuildService";
import { mockAuth } from "@/test/mockAuth";
import "@/utils";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { auditLogRouter } from "./auditLog";

vi.mock("@/services/auditLogService", () => ({
  getAuditLog: vi.fn(),
}));

vi.mock("@/services/discordGuildService", () => ({
  isCanvasAdmin: vi.fn(),
}));

const createApp = ({ authenticated = false, admin = false } = {}) => {
  const app = express();
  app.use(express.json());
  app.use(mockAuth);

  const setTestRequestState: RequestHandler = (req, _res, next) => {
    req.session = {} as typeof req.session;
    if (authenticated) {
      req.session.discordAccessToken = "test-access-token";
    }
    if (admin && req.user) {
      req.user = {
        ...req.user,
        isCanvasAdmin: true,
      };
    }
    next();
  };

  app.use(setTestRequestState);
  app.use("/api/v1/audit-log", auditLogRouter);
  app.use(errorHandler);
  return app;
};

describe("Audit log route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const app = createApp();
    const response = await request(app).get("/api/v1/audit-log");
    expect(response.status).toBe(401);
    expect(getAuditLog).not.toHaveBeenCalled();
  });

  it("returns 403 when the user is not an admin", async () => {
    const app = createApp({ authenticated: true, admin: false });
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(false);
    const response = await request(app)
      .get("/api/v1/audit-log")
      .set("Test-User-Id", "1");
    expect(response.status).toBe(403);
    expect(getAuditLog).not.toHaveBeenCalled();
  });

  it("returns audit entries with applied filters", async () => {
    const createdAt = "2026-05-22T10:00:00.000Z";
    vi.mocked(getAuditLog).mockResolvedValueOnce({
      entries: [
        {
          id: "1",
          createdAt,
          actorId: "1",
          actorRole: "admin",
          actorUsername: "tester",
          actorProfilePictureUrl: null,
          action: "blocklist.add",
          resourceType: "blocklist",
          resourceId: null,
          metadata: { count: 1 },
        },
      ],
      nextCursor: "next-cursor-token",
    });

    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createApp({ authenticated: true, admin: true });
    const response = await request(app)
      .get("/api/v1/audit-log")
      .query({ action: "blocklist.", limit: 25 })
      .set("Test-User-Id", "1")
      .expect(200);

    expect(getAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "blocklist.", limit: 25 }),
    );
    expect(response.body).toEqual({
      entries: [
        {
          id: "1",
          createdAt,
          actorId: "1",
          actorRole: "admin",
          actorUsername: "tester",
          actorProfilePictureUrl: null,
          action: "blocklist.add",
          resourceType: "blocklist",
          resourceId: null,
          metadata: { count: 1 },
        },
      ],
      nextCursor: "next-cursor-token",
    });
  });

  it("rejects an invalid actorId query parameter", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createApp({ authenticated: true, admin: true });
    const response = await request(app)
      .get("/api/v1/audit-log")
      .query({ actorId: "not-a-number" })
      .set("Test-User-Id", "1");
    expect(response.status).toBe(400);
    expect(getAuditLog).not.toHaveBeenCalled();
  });
});
