import express from "express";
import request from "supertest";

import { createEvent, editEvent } from "@/services/eventService";
import { eventRouter } from "./event";

vi.mock("@/services/eventService", () => ({
  createEvent: vi.fn(),
  editEvent: vi.fn(),
  getCurrentEvent: vi.fn(),
  getEventById: vi.fn(),
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
  return app;
};

describe("Event admin route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an event", async () => {
    const app = createApp();
    vi.mocked(createEvent).mockResolvedValueOnce(undefined);

    const response = await request(app).post("/api/v1/event/").send({
      id: 42,
      name: "Spring Event",
    });

    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual({
      message: "Event created",
    });
    expect(vi.mocked(createEvent)).toHaveBeenCalledWith("Spring Event", 42);
  });

  it("edits an event", async () => {
    const app = createApp();
    vi.mocked(editEvent).mockResolvedValueOnce(undefined);

    const response = await request(app).put("/api/v1/event/42").send({
      name: "Updated Event",
    });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Event edited",
    });
    expect(vi.mocked(editEvent)).toHaveBeenCalledWith(42, "Updated Event");
  });
});
