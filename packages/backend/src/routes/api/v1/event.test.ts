import express from "express";
import request from "supertest";
import { errorHandler } from "@/middleware/errorHandler";
import { audit } from "@/services/auditLogService";
import { isCanvasAdmin } from "@/services/discordGuildService";
import { createEvent, editEvent } from "@/services/eventService";
import { eventRouter } from "./event";

vi.mock("@/services/eventService", () => ({
  createEvent: vi.fn(),
  editEvent: vi.fn(),
  getCurrentEvent: vi.fn(),
  getEventById: vi.fn(),
}));

vi.mock("@/services/auditLogService", () => ({
  audit: vi.fn(async () => {}),
}));

vi.mock("@/services/discordGuildService", () => ({
  isCanvasAdmin: vi.fn(),
  isCanvasModerator: vi.fn(),
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { isCanvasAdmin: true } as Express.User;
    req.session = {
      discordAccessToken: "test-access-token",
    } as typeof req.session;
    next();
  });
  app.use("/api/v1/event", eventRouter);
  app.use(errorHandler);
  return app;
};

describe("Event admin route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an event", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createApp();
    vi.mocked(createEvent).mockResolvedValueOnce({
      id: 42,
      name: "Spring Event",
      isCurrentEvent: false,
    });

    const response = await request(app).post("/api/v1/event/").send({
      id: 42,
      name: "Spring Event",
    });

    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual({
      id: 42,
      name: "Spring Event",
      isCurrentEvent: false,
    });
    expect(vi.mocked(createEvent)).toHaveBeenCalledWith("Spring Event", 42);
    expect(audit).toHaveBeenCalledWith(
      expect.anything(),
      "admin",
      "event.create",
      expect.objectContaining({ resourceId: 42 }),
    );
  });

  it("edits an event", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createApp();
    vi.mocked(editEvent).mockResolvedValueOnce({
      id: 42,
      name: "Updated Event",
      isCurrentEvent: false,
    });

    const response = await request(app).put("/api/v1/event/42").send({
      name: "Updated Event",
    });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      id: 42,
      name: "Updated Event",
      isCurrentEvent: false,
    });
    expect(vi.mocked(editEvent)).toHaveBeenCalledWith(42, "Updated Event");
    expect(audit).toHaveBeenCalledWith(
      expect.anything(),
      "admin",
      "event.update",
      expect.objectContaining({ resourceId: 42 }),
    );
  });
});
